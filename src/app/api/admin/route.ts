import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

import { isAdminEmail } from '@/lib/admin';
import { logger } from '@/lib/logger';

import {
  authenticateUser,
  FAKE_DOMAIN,
  getSupabaseConfig,
  handleProfileAction,
} from '../_lib/profile-actions';

async function authenticateAdmin(req: Request) {
  const auth = await authenticateUser(req);
  if ('error' in auth) return auth;

  if (!isAdminEmail(auth.user.email ?? undefined)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return auth;
}

export async function GET(req: Request) {
  const auth = await authenticateAdmin(req);
  if ('error' in auth) return auth.error;

  const { url, serviceKey } = getSupabaseConfig();

  if (!serviceKey) {
    return NextResponse.json(
      {
        error:
          'SUPABASE_SERVICE_ROLE_KEY is not configured. Admin queries require the service role key to bypass RLS.',
      },
      { status: 500 },
    );
  }

  const client = createClient(url, serviceKey);

  // Fetch all data in parallel
  const [
    profilesRes,
    decksRes,
    cardsRes,
    todosRes,
    waitlistRes,
    eventTypesRes,
    embedEventsRes,
    groupsRes,
  ] = await Promise.all([
    client
      .from('profiles')
      .select('id, username, display_name, color_scheme, account_type, created_at'),
    client.from('decks').select('id, user_id, name, created_at, emoji, pinned, is_public'),
    client.from('cards').select('id, deck_id, word, card_type, jlpt_level, created_at'),
    client
      .from('todos')
      .select('id, user_id, text, emoji, completed, frequency_days, completed_dates, created_at'),
    client
      .from('waitlist')
      .select('id, email, name, message, created_at')
      .order('created_at', { ascending: false }),
    client.from('event_types').select('id, user_id, name, emoji, color'),
    client
      .from('embed_events')
      .select('deck_id, session_id, event_type, card_index, duration_seconds, created_at'),
    client
      .from('groups')
      .select('id, organizer_id, name, emoji')
      .order('created_at', { ascending: true }),
  ]);

  const profiles = profilesRes.data ?? [];
  const decks = decksRes.data ?? [];
  const cards = cardsRes.data ?? [];
  const todos = todosRes.data ?? [];
  const waitlist = waitlistRes.data ?? [];
  const eventTypes = eventTypesRes.data ?? [];
  const embedEvents = embedEventsRes.data ?? [];
  const groups = (groupsRes.data ?? []).map((g) => ({
    id: g.id,
    organizerId: g.organizer_id,
    name: g.name,
    emoji: g.emoji,
  }));

  // Build embed analytics per public deck
  const publicDecksById = Object.fromEntries(
    decks.filter((d) => d.is_public).map((d) => [d.id, d]),
  );

  const embedDeckMap: Record<
    string,
    {
      deckId: string;
      deckName: string;
      deckEmoji: string;
      totalViews: number;
      uniqueSessions: Set<string>;
      completions: number;
      durations: number[];
      lastViewedAt: string | null;
    }
  > = {};

  for (const ev of embedEvents) {
    if (!embedDeckMap[ev.deck_id]) {
      const deck = publicDecksById[ev.deck_id];
      embedDeckMap[ev.deck_id] = {
        deckId: ev.deck_id,
        deckName: deck?.name ?? 'Unknown deck',
        deckEmoji: deck?.emoji ?? '📘',
        totalViews: 0,
        uniqueSessions: new Set(),
        completions: 0,
        durations: [],
        lastViewedAt: null,
      };
    }
    const stat = embedDeckMap[ev.deck_id];
    stat.uniqueSessions.add(ev.session_id);
    if (ev.event_type === 'view') stat.totalViews++;
    if (ev.event_type === 'deck_complete') stat.completions++;
    if (ev.event_type === 'session_end' && ev.duration_seconds != null) {
      stat.durations.push(ev.duration_seconds);
    }
    if (ev.created_at && (!stat.lastViewedAt || ev.created_at > stat.lastViewedAt)) {
      stat.lastViewedAt = ev.created_at;
    }
  }

  const embedAnalytics = {
    overview: {
      totalViews: embedEvents.filter((e) => e.event_type === 'view').length,
      totalSessions: new Set(embedEvents.map((e) => e.session_id)).size,
      totalCompletions: embedEvents.filter((e) => e.event_type === 'deck_complete').length,
    },
    decks: Object.values(embedDeckMap)
      .map((s) => ({
        deckId: s.deckId,
        deckName: s.deckName,
        deckEmoji: s.deckEmoji,
        totalViews: s.totalViews,
        uniqueSessions: s.uniqueSessions.size,
        completions: s.completions,
        avgDurationSeconds: s.durations.length
          ? Math.round(s.durations.reduce((a, b) => a + b, 0) / s.durations.length)
          : null,
        lastViewedAt: s.lastViewedAt,
      }))
      .sort((a, b) => b.totalViews - a.totalViews),
  };

  // Build per-user stats
  const userStats = profiles.map((p) => {
    const userDecks = decks.filter((d) => d.user_id === p.id);
    const userDeckIds = new Set(userDecks.map((d) => d.id));
    const userCards = cards.filter((c) => userDeckIds.has(c.deck_id));
    const userTodos = todos.filter((t) => t.user_id === p.id);
    const userEventTypes = eventTypes.filter((e) => e.user_id === p.id);

    const totalCompletions = userTodos.reduce((sum, t) => {
      const dates = t.completed_dates;
      return sum + (Array.isArray(dates) ? dates.length : 0);
    }, 0);

    return {
      id: p.id,
      username: p.username,
      displayName: p.display_name,
      colorScheme: p.color_scheme,
      accountType: p.account_type ?? 'organizer',
      createdAt: p.created_at,
      deckCount: userDecks.length,
      cardCount: userCards.length,
      todoCount: userTodos.length,
      todoCompletions: totalCompletions,
      eventTypeCount: userEventTypes.length,
      publicDecks: userDecks.filter((d) => d.is_public).length,
    };
  });

  const overview = {
    totalUsers: profiles.length,
    totalDecks: decks.length,
    totalCards: cards.length,
    totalTodos: todos.length,
    totalWaitlist: waitlist.length,
    totalEventTypes: eventTypes.length,
  };

  return NextResponse.json({ overview, users: userStats, waitlist, embedAnalytics, groups });
}

export async function PATCH(req: Request) {
  const auth = await authenticateAdmin(req);
  if ('error' in auth) return auth.error;

  const body = (await req.json()) as Record<string, unknown>;
  const { userId } = body as { userId?: string };

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  return handleProfileAction(auth.serviceClient, userId, body);
}

export async function POST(req: Request) {
  const auth = await authenticateAdmin(req);
  if ('error' in auth) return auth.error;

  const body = (await req.json()) as Record<string, unknown>;
  const username = ((body.username as string) ?? '').trim().toLowerCase();
  const password = (body.password as string) ?? '';
  const displayName = ((body.displayName as string) ?? '').trim() || null;
  const accountType = (body.accountType as string) ?? 'organizer';
  const organizerId = (body.organizerId as string) || null;
  const groupId = (body.groupId as string) || null;
  const newGroupName = ((body.newGroupName as string) ?? '').trim() || null;

  if (!username || !/^[a-zA-Z0-9_-]{2,30}$/.test(username)) {
    return NextResponse.json(
      { error: 'Username must be 2-30 characters (letters, numbers, _ or -).' },
      { status: 400 },
    );
  }
  if (!password || password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
  }
  if (!['organizer', 'member'].includes(accountType)) {
    return NextResponse.json({ error: 'Invalid account type.' }, { status: 400 });
  }
  if (accountType === 'member' && !organizerId) {
    return NextResponse.json({ error: 'Member accounts require an organizer.' }, { status: 400 });
  }

  const sc = auth.serviceClient;

  // Check username uniqueness
  const { data: existing } = await sc
    .from('profiles')
    .select('id')
    .eq('username', username)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: 'Username is already taken.' }, { status: 409 });
  }

  // If creating a member with a new group, create the group first
  let resolvedGroupId = groupId;
  if (accountType === 'member' && newGroupName && organizerId) {
    const { data: group, error: groupErr } = await sc
      .from('groups')
      .insert({ organizer_id: organizerId, name: newGroupName })
      .select('id')
      .single();

    if (groupErr) {
      logger.error('Admin: failed to create group', { error: groupErr.message });
      return NextResponse.json({ error: 'Failed to create group.' }, { status: 500 });
    }
    resolvedGroupId = group.id;
  }

  // Create auth user
  const email = `${username}@${FAKE_DOMAIN}`;
  const { data: authData, error: authError } = await sc.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    logger.error('Admin: failed to create auth user', { error: authError?.message });
    return NextResponse.json({ error: 'Failed to create auth user.' }, { status: 500 });
  }

  const userId = authData.user.id;

  // Create profile
  const profile: Record<string, unknown> = {
    id: userId,
    username,
    display_name: displayName,
    account_type: accountType,
  };
  if (accountType === 'member') {
    profile.organizer_id = organizerId;
    profile.group_id = resolvedGroupId;
  }

  const { error: profileErr } = await sc.from('profiles').insert(profile);
  if (profileErr) {
    logger.error('Admin: failed to create profile', { error: profileErr.message });
    await sc.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: 'Failed to create profile.' }, { status: 500 });
  }

  // Auto-share organizer's decks with new member
  if (accountType === 'member' && organizerId) {
    const { data: orgDecks } = await sc.from('decks').select('id').eq('user_id', organizerId);
    if (orgDecks && orgDecks.length > 0) {
      const shares = orgDecks.map((d: { id: string }) => ({
        deck_id: d.id,
        owner_id: organizerId,
        shared_with: userId,
      }));
      const { error: shareErr } = await sc.from('deck_shares').insert(shares);
      if (shareErr) {
        logger.warn('Admin: failed to auto-share decks', { error: shareErr.message });
      }
    }
  }

  return NextResponse.json(
    { message: `User "${username}" created as ${accountType}.`, userId },
    { status: 201 },
  );
}
