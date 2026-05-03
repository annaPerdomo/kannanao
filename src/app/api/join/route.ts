import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { logger } from '@/lib/logger';

import { rateLimit } from '../_lib/rateLimit';
import { getServiceSupabase } from '../group/_lib/serviceSupabase';

const RATE_LIMIT = { windowMs: 60_000, max: 5 };

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

  const { code, username, displayName, password } = parsed.data;
  const lowerUsername = username.trim().toLowerCase();
  const sb = getServiceSupabase();

  // 1. Validate invite code
  const { data: invite, error: inviteError } = await sb
    .from('invite_codes')
    .select('*')
    .eq('code', code)
    .single();

  if (inviteError || !invite) {
    return NextResponse.json({ error: 'Invalid invite code.' }, { status: 404 });
  }

  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return NextResponse.json(
      { error: 'This invite has expired. Ask for a new one!' },
      { status: 410 },
    );
  }

  if (invite.max_uses !== null && invite.times_used >= invite.max_uses) {
    return NextResponse.json(
      { error: 'This invite has been fully used. Ask for a new one!' },
      { status: 410 },
    );
  }

  // 2. Check username uniqueness
  const { data: existing } = await sb
    .from('profiles')
    .select('id')
    .eq('username', lowerUsername)
    .single();

  if (existing) {
    return NextResponse.json({ error: 'Username is already taken.' }, { status: 409 });
  }

  // 3. Create auth user
  const email = `${lowerUsername}@${FAKE_DOMAIN}`;
  const { data: authData, error: authError } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    logger.error('Failed to create auth user', { route: '/api/join', error: authError?.message });
    return NextResponse.json({ error: 'Failed to create account.' }, { status: 500 });
  }

  const userId = authData.user.id;

  // 4. Create profile with member role
  const { error: profileError } = await sb.from('profiles').insert({
    id: userId,
    username: lowerUsername,
    display_name: displayName?.trim() || null,
    account_type: 'member',
    organizer_id: invite.organizer_id,
    group_id: invite.group_id ?? null,
  });

  if (profileError) {
    logger.error('Failed to create profile', { route: '/api/join', error: profileError.message });
    // Clean up auth user
    await sb.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: 'Failed to create profile.' }, { status: 500 });
  }

  // 5. Increment invite usage
  await sb
    .from('invite_codes')
    .update({ times_used: invite.times_used + 1 })
    .eq('id', invite.id);

  // 6. Auto-share all organizer's decks with the new member
  const { data: orgDecks } = await sb.from('decks').select('id').eq('user_id', invite.organizer_id);

  if (orgDecks && orgDecks.length > 0) {
    const shares = orgDecks.map((d: { id: string }) => ({
      deck_id: d.id,
      owner_id: invite.organizer_id,
      shared_with: userId,
    }));
    const { error: shareError } = await sb.from('deck_shares').insert(shares);
    if (shareError) {
      logger.warn('Failed to auto-share decks', { route: '/api/join', error: shareError.message });
    }
  }

  // 7. Sign in the new user and return session
  const { data: signInData, error: signInError } = await sb.auth.signInWithPassword({
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
  const code = req.nextUrl.searchParams.get('code');
  if (!code) {
    return NextResponse.json({ error: 'Code is required.' }, { status: 400 });
  }

  const sb = getServiceSupabase();

  const { data: invite, error } = await sb
    .from('invite_codes')
    .select('id, organizer_id, group_id, max_uses, times_used, expires_at')
    .eq('code', code)
    .single();

  if (error || !invite) {
    return NextResponse.json({ valid: false, reason: 'Invalid invite code.' });
  }

  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({
      valid: false,
      reason: 'This invite has expired. Ask for a new one!',
    });
  }

  if (invite.max_uses !== null && invite.times_used >= invite.max_uses) {
    return NextResponse.json({
      valid: false,
      reason: 'This invite has been fully used. Ask for a new one!',
    });
  }

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
