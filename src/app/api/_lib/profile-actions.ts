import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

import { getUserFromToken } from './authCache';

export const FAKE_DOMAIN = 'kannanao.local';

async function createGroupForOrganizer(
  client: SupabaseClient,
  organizerId: string,
  name: string,
): Promise<{ groupId: string } | { error: NextResponse }> {
  const { data, error } = await client
    .from('groups')
    .insert({ organizer_id: organizerId, name })
    .select('id')
    .single();
  if (error) {
    return { error: NextResponse.json({ error: 'Failed to create group.' }, { status: 500 }) };
  }
  return { groupId: data.id };
}

export function getSupabaseConfig() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '',
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  };
}

type AuthSuccess = { user: { id: string; email?: string }; serviceClient: SupabaseClient };
type AuthFailure = { error: NextResponse };

/** Verify a Bearer token and return the authenticated user + a service-role client. */
export async function authenticateUser(req: Request): Promise<AuthSuccess | AuthFailure> {
  const { url, anonKey, serviceKey } = getSupabaseConfig();

  if (!url || !anonKey || !serviceKey) {
    return { error: NextResponse.json({ error: 'Server misconfigured' }, { status: 500 }) };
  }

  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const token = authHeader.slice(7);
  const user = await getUserFromToken(token);

  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  return { user, serviceClient: createClient(url, serviceKey) };
}

/** Handle the three profile mutation actions shared by /api/profile and /api/admin. */
export async function handleProfileAction(
  serviceClient: SupabaseClient,
  userId: string,
  body: Record<string, unknown>,
): Promise<NextResponse> {
  const { action } = body;

  if (action === 'changePassword') {
    const password = body.password as string | undefined;
    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters.' },
        { status: 400 },
      );
    }
    const { error } = await serviceClient.auth.admin.updateUserById(userId, { password });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ message: 'Password updated.' });
  }

  if (action === 'changeUsername') {
    const username = body.username as string | undefined;
    if (!username || !/^[a-zA-Z0-9_-]{2,30}$/.test(username)) {
      return NextResponse.json(
        { error: 'Username must be 2–30 characters (letters, numbers, _ or -).' },
        { status: 400 },
      );
    }

    const normalised = username.trim().toLowerCase();

    const { data: existing } = await serviceClient
      .from('profiles')
      .select('id')
      .eq('username', normalised)
      .maybeSingle();
    if (existing && existing.id !== userId) {
      return NextResponse.json({ error: 'Username already taken.' }, { status: 409 });
    }

    const { error: authErr } = await serviceClient.auth.admin.updateUserById(userId, {
      email: `${normalised}@${FAKE_DOMAIN}`,
    });
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 500 });

    const { error: profileErr } = await serviceClient
      .from('profiles')
      .update({ username: normalised })
      .eq('id', userId);
    if (profileErr) return NextResponse.json({ error: profileErr.message }, { status: 500 });

    return NextResponse.json({ message: 'Username updated.' });
  }

  if (action === 'changeDisplayName') {
    const displayName = body.displayName as string | undefined;
    const trimmed = (displayName ?? '').trim().slice(0, 100);

    const { error: profileErr } = await serviceClient
      .from('profiles')
      .update({ display_name: trimmed || null })
      .eq('id', userId);
    if (profileErr) return NextResponse.json({ error: profileErr.message }, { status: 500 });

    return NextResponse.json({ message: 'Display name updated.' });
  }

  if (action === 'changeAccountType') {
    const accountType = body.accountType as string | undefined;
    if (!accountType || !['organizer', 'member'].includes(accountType)) {
      return NextResponse.json(
        { error: 'accountType must be "organizer" or "member".' },
        { status: 400 },
      );
    }

    // Entitlement only (see groupRole.ts): an organizer can still learn in
    // someone else's group, so upgrading must not clear their membership.
    const update: Record<string, unknown> = { account_type: accountType };
    if (accountType === 'member') {
      const organizerId = body.organizerId as string | undefined;
      let groupId = body.groupId as string | undefined;
      const newGroupName = ((body.newGroupName as string) ?? '').trim();
      if (!organizerId) {
        return NextResponse.json(
          { error: 'Member accounts require an organizer.' },
          { status: 400 },
        );
      }
      if (!groupId && newGroupName) {
        const created = await createGroupForOrganizer(serviceClient, organizerId, newGroupName);
        if ('error' in created) return created.error;
        groupId = created.groupId;
      }
      update.organizer_id = organizerId;
      update.group_id = groupId ?? null;
    }

    const { error: profileErr } = await serviceClient
      .from('profiles')
      .update(update)
      .eq('id', userId);
    if (profileErr) return NextResponse.json({ error: profileErr.message }, { status: 500 });

    return NextResponse.json({ message: `Account type changed to ${accountType}.` });
  }

  if (action === 'changeGroup') {
    let groupId = body.groupId as string | undefined;
    const newGroupName = ((body.newGroupName as string) ?? '').trim();
    const organizerId = body.organizerId as string | undefined;

    if (!groupId && newGroupName && organizerId) {
      const created = await createGroupForOrganizer(serviceClient, organizerId, newGroupName);
      if ('error' in created) return created.error;
      groupId = created.groupId;
    }

    if (!groupId) {
      return NextResponse.json({ error: 'groupId is required.' }, { status: 400 });
    }

    const { error: profileErr } = await serviceClient
      .from('profiles')
      .update({ group_id: groupId })
      .eq('id', userId);
    if (profileErr) return NextResponse.json({ error: profileErr.message }, { status: 500 });

    return NextResponse.json({ message: 'Group updated.' });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
