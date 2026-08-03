import { createClient } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { LOCALES } from '@/i18n/config';
import { logger } from '@/lib/logger';

import { rateLimit } from '../_lib/rateLimit';
import { getServiceSupabase } from '../group/_lib/serviceSupabase';
import {
  checkInvite,
  claimInviteUse,
  releaseInviteClaim,
  shareOrganizerDecks,
} from './_lib/invite';

/**
 * Sized for a whole group scanning one projected QR code from a single shared
 * IP, which is how this route is normally used. There is no account to key on
 * here — that is the point of it — so the ceiling is the only lever, and abuse
 * stays bounded by needing a live invite code and by its `max_uses`.
 */
const RATE_LIMIT = { windowMs: 60_000, max: 30 };
const GET_RATE_LIMIT = { windowMs: 60_000, max: 60 };

const FAKE_DOMAIN = 'kannanao.local';

const JoinSchema = z.object({
  code: z.string().min(1, 'Invite code is required'),
  username: z
    .string()
    .min(2, 'Username must be at least 2 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, _ or -'),
  displayName: z.string().max(100).optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  /**
   * The joiner's current NEXT_LOCALE, sent by the join page so the language they
   * picked on the landing survives account creation instead of resetting to
   * English at the door.
   *
   * Optional, and absent means NULL rather than 'en' — a member who never
   * touched the toggle has expressed no preference, and writing 'en' would
   * silently out-rank their device's Japanese at every later sign-in. Validated
   * against LOCALES because it lands in a CHECK-constrained column; an unknown
   * value would fail the insert and take the whole join with it.
   */
  locale: z.enum(LOCALES).optional(),
});

/** POST — public: validate invite code, create member account, auto-share decks */
export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, RATE_LIMIT);
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const parsed = JoinSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request' },
      { status: 400 },
    );
  }

  const { code, username, displayName, password, locale } = parsed.data;
  const lowerUsername = username.trim().toLowerCase();
  const sb = getServiceSupabase();

  // 1. Validate invite code
  const checked = await checkInvite(sb, code);
  if (!checked.ok) {
    return NextResponse.json(
      { error: checked.reason, code: checked.code },
      { status: checked.status },
    );
  }
  const invite = checked.invite;

  // 2. Claim a use of the invite BEFORE creating the account
  if (!(await claimInviteUse(sb, invite))) {
    return NextResponse.json(
      { error: 'This invite was just used by someone else. Please try again!' },
      { status: 409 },
    );
  }

  const releaseClaim = () => releaseInviteClaim(sb, invite);

  // 3. Check username uniqueness
  const { data: existing } = await sb
    .from('profiles')
    .select('id')
    .eq('username', lowerUsername)
    .single();

  if (existing) {
    await releaseClaim();
    return NextResponse.json({ error: 'Username is already taken.' }, { status: 409 });
  }

  // 4. Create auth user
  const email = `${lowerUsername}@${FAKE_DOMAIN}`;
  const { data: authData, error: authError } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    logger.error('Failed to create auth user', { route: '/api/join', error: authError?.message });
    await releaseClaim();
    return NextResponse.json({ error: 'Failed to create account.' }, { status: 500 });
  }

  const userId = authData.user.id;

  // 5. Create profile with member role
  const { error: profileError } = await sb.from('profiles').insert({
    id: userId,
    username: lowerUsername,
    display_name: displayName?.trim() || null,
    account_type: 'member',
    organizer_id: invite.organizer_id,
    group_id: invite.group_id ?? null,
    locale: locale ?? null,
  });

  if (profileError) {
    logger.error('Failed to create profile', { route: '/api/join', error: profileError.message });
    // Clean up auth user
    await sb.auth.admin.deleteUser(userId);
    await releaseClaim();
    return NextResponse.json({ error: 'Failed to create profile.' }, { status: 500 });
  }

  // 6. Auto-share all organizer's decks with the new member
  await shareOrganizerDecks(sb, invite.organizer_id, userId, '/api/join');

  // 7. Sign in the new user and return session. This must NOT run on the
  // shared service-role client: signInWithPassword stores a session on the
  // client, and every later query on that cached singleton would then be sent
  // with the member's JWT (RLS applies) instead of the service key. Use a
  // throwaway anon client instead.
  const anonUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!anonUrl || !anonKey) {
    return NextResponse.json({ success: true, session: null }, { status: 201 });
  }
  const authClient = createClient(anonUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: signInData, error: signInError } = await authClient.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError || !signInData.session) {
    // Account was created successfully, but auto-sign-in failed — user can sign in manually
    logger.warn('Auto sign-in failed after join', {
      route: '/api/join',
      error: signInError?.message,
    });
    return NextResponse.json({ success: true, session: null }, { status: 201 });
  }

  return NextResponse.json(
    {
      success: true,
      session: {
        access_token: signInData.session.access_token,
        refresh_token: signInData.session.refresh_token,
      },
    },
    { status: 201 },
  );
}

/** GET — validate an invite code (used by the join page to check before showing the form) */
export async function GET(req: NextRequest) {
  const limited = await rateLimit(req, GET_RATE_LIMIT);
  if (limited) return limited;

  const code = req.nextUrl.searchParams.get('code');
  if (!code) {
    return NextResponse.json({ error: 'Code is required.' }, { status: 400 });
  }

  const sb = getServiceSupabase();

  const checked = await checkInvite(sb, code);
  if (!checked.ok) {
    return NextResponse.json({ valid: false, reason: checked.reason, code: checked.code });
  }
  const invite = checked.invite;

  // Fetch organizer display name and group name
  const [organizerRes, groupRes] = await Promise.all([
    sb.from('profiles').select('display_name, username').eq('id', invite.organizer_id).single(),
    invite.group_id
      ? sb.from('groups').select('name').eq('id', invite.group_id).single()
      : Promise.resolve({ data: null }),
  ]);

  const organizer = organizerRes.data;

  return NextResponse.json({
    valid: true,
    organizerName: organizer?.display_name || organizer?.username || 'your organizer',
    groupName: groupRes.data?.name ?? null,
  });
}
