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
    studySessionsRes,
    loginEventsRes,
    travelEventsRes,
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
      .select(
        'deck_id, session_id, event_type, card_index, duration_seconds, referrer, created_at',
      ),
    client
      .from('groups')
      .select('id, organizer_id, name, emoji')
      .order('created_at', { ascending: true }),
    client
      .from('study_sessions')
      .select(
        'user_id, deck_id, practice_mode, cards_studied, cards_correct, xp_earned, duration_secs, started_at',
      )
      .gte('started_at', new Date(Date.now() - 90 * 86_400_000).toISOString()),
    client.rpc('login_stats_per_user'),
    client
      .from('travel_events')
      .select('user_id, feature, action, metadata, created_at')
      .order('created_at', { ascending: false }),
  ]);

  const profiles = profilesRes.data ?? [];
  const decks = decksRes.data ?? [];
  const cards = cardsRes.data ?? [];
  const todos = todosRes.data ?? [];
  const waitlist = waitlistRes.data ?? [];
  const eventTypes = eventTypesRes.data ?? [];
  const embedEvents = embedEventsRes.data ?? [];
  const studySessions = studySessionsRes.data ?? [];
  const loginStats = loginEventsRes.data ?? [];
  const travelEvents = travelEventsRes.data ?? [];
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
  // Map user IDs to display names for deck owners
  const profileById = Object.fromEntries(profiles.map((p) => [p.id, p]));
  // Count cards per deck for drop-off analysis
  const cardCountByDeck: Record<string, number> = {};
  for (const c of cards) {
    cardCountByDeck[c.deck_id] = (cardCountByDeck[c.deck_id] || 0) + 1;
  }

  interface EmbedDeckAccum {
    deckId: string;
    deckName: string;
    deckEmoji: string;
    deckOwner: string;
    totalCards: number;
    uniqueSessions: Set<string>;
    completedSessions: Set<string>;
    durations: number[];
    lastViewedAt: string | null;
    sessionMaxCard: Map<string, number>;
    cardFlipCounts: Map<number, number>;
  }

  const embedDeckMap: Record<string, EmbedDeckAccum> = {};

  for (const ev of embedEvents) {
    if (!embedDeckMap[ev.deck_id]) {
      const deck = publicDecksById[ev.deck_id];
      const owner = deck ? profileById[deck.user_id] : undefined;
      embedDeckMap[ev.deck_id] = {
        deckId: ev.deck_id,
        deckName: deck?.name ?? 'Unknown deck',
        deckEmoji: deck?.emoji ?? '📘',
        deckOwner: owner?.display_name ?? owner?.username ?? 'Unknown',
        totalCards: cardCountByDeck[ev.deck_id] ?? 0,
        uniqueSessions: new Set(),
        completedSessions: new Set(),
        durations: [],
        lastViewedAt: null,
        sessionMaxCard: new Map(),
        cardFlipCounts: new Map(),
      };
    }
    const stat = embedDeckMap[ev.deck_id];
    stat.uniqueSessions.add(ev.session_id);
    if (ev.event_type === 'deck_complete') stat.completedSessions.add(ev.session_id);
    if (ev.event_type === 'session_end' && ev.duration_seconds != null) {
      stat.durations.push(ev.duration_seconds);
    }
    if (ev.event_type === 'card_flip' && ev.card_index != null) {
      const prev = stat.sessionMaxCard.get(ev.session_id) ?? -1;
      if (ev.card_index > prev) stat.sessionMaxCard.set(ev.session_id, ev.card_index);
      stat.cardFlipCounts.set(ev.card_index, (stat.cardFlipCounts.get(ev.card_index) ?? 0) + 1);
    }
    if (
      ev.event_type === 'view' &&
      ev.created_at &&
      (!stat.lastViewedAt || ev.created_at > stat.lastViewedAt)
    ) {
      stat.lastViewedAt = ev.created_at;
    }
  }

  // Referrer breakdown — count unique sessions per referrer host
  const referrerSessionMap: Record<string, Set<string>> = {};
  for (const ev of embedEvents) {
    if (ev.event_type === 'view' && ev.referrer) {
      let host: string;
      try {
        host = new URL(ev.referrer).hostname || ev.referrer;
      } catch {
        host = ev.referrer;
      }
      if (!referrerSessionMap[host]) referrerSessionMap[host] = new Set();
      referrerSessionMap[host].add(ev.session_id);
    }
  }
  const referrers = Object.entries(referrerSessionMap)
    .map(([source, sessions]) => ({ source, sessions: sessions.size }))
    .sort((a, b) => b.sessions - a.sessions);

  // Sessions over time (last 30 days)
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sessionsByDate: Record<string, Set<string>> = {};
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo);
    d.setDate(d.getDate() + i + 1);
    sessionsByDate[d.toISOString().slice(0, 10)] = new Set();
  }
  for (const ev of embedEvents) {
    if (ev.event_type === 'view' && ev.created_at) {
      const dateKey = ev.created_at.slice(0, 10);
      if (dateKey in sessionsByDate) sessionsByDate[dateKey].add(ev.session_id);
    }
  }
  const sessionsOverTime = Object.entries(sessionsByDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, sessions]) => ({ date, sessions: sessions.size }));

  const embedAnalytics = {
    overview: {
      totalSessions: new Set(embedEvents.map((e) => e.session_id)).size,
      totalCompletions: new Set(
        embedEvents.filter((e) => e.event_type === 'deck_complete').map((e) => e.session_id),
      ).size,
    },
    referrers,
    sessionsOverTime,
    decks: Object.values(embedDeckMap)
      .map((s) => {
        const sessions = s.uniqueSessions.size;
        const completions = s.completedSessions.size;
        const maxCards = Array.from(s.sessionMaxCard.values());
        const avgCardsFlipped = maxCards.length
          ? Math.round((maxCards.reduce((a, b) => a + b, 0) / maxCards.length + 1) * 10) / 10
          : null;
        const incompleteSessions = Array.from(s.sessionMaxCard.entries()).filter(
          ([sid]) => !s.completedSessions.has(sid),
        );
        const dropOffCounts: Record<number, number> = {};
        for (const [, maxIdx] of incompleteSessions) {
          dropOffCounts[maxIdx] = (dropOffCounts[maxIdx] || 0) + 1;
        }
        const dropOffEntries = Object.entries(dropOffCounts)
          .map(([idx, count]) => ({ cardIndex: Number(idx), count }))
          .sort((a, b) => b.count - a.count);
        const topDropOff = dropOffEntries.length > 0 ? dropOffEntries[0].cardIndex : null;
        const cardDifficulty = Array.from(s.cardFlipCounts.entries())
          .map(([cardIndex, flips]) => ({ cardIndex, flips }))
          .sort((a, b) => b.flips - a.flips);

        return {
          deckId: s.deckId,
          deckName: s.deckName,
          deckEmoji: s.deckEmoji,
          deckOwner: s.deckOwner,
          totalCards: s.totalCards,
          sessions,
          completions,
          completionRate: sessions > 0 ? Math.round((completions / sessions) * 100) : null,
          avgCardsFlipped,
          avgDurationSeconds: s.durations.length
            ? Math.round(s.durations.reduce((a, b) => a + b, 0) / s.durations.length)
            : null,
          topDropOffCard: topDropOff,
          cardDifficulty: cardDifficulty.slice(0, 10),
          lastViewedAt: s.lastViewedAt,
        };
      })
      .sort((a, b) => b.sessions - a.sessions),
  };

  // Pre-group study sessions by user_id for O(1) lookup
  const sessionsByUser = new Map<string, typeof studySessions>();
  for (const s of studySessions) {
    const arr = sessionsByUser.get(s.user_id);
    if (arr) arr.push(s);
    else sessionsByUser.set(s.user_id, [s]);
  }

  // Member activity summary
  const memberActivity = profiles
    .filter((p) => p.account_type === 'member')
    .map((p) => {
      const sessions = sessionsByUser.get(p.id) ?? [];
      const totalStudied = sessions.reduce((sum, s) => sum + (s.cards_studied || 0), 0);
      const totalCorrect = sessions.reduce((sum, s) => sum + (s.cards_correct || 0), 0);
      const totalDuration = sessions.reduce((sum, s) => sum + (s.duration_secs || 0), 0);
      const lastSession = sessions.length
        ? sessions.reduce((latest, s) => (s.started_at > latest.started_at ? s : latest)).started_at
        : null;
      // Sessions in the last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentSessions = sessions.filter((s) => new Date(s.started_at) >= sevenDaysAgo).length;

      return {
        userId: p.id,
        username: p.username,
        displayName: p.display_name,
        totalSessions: sessions.length,
        recentSessions,
        totalCardsStudied: totalStudied,
        accuracy: totalStudied > 0 ? Math.round((totalCorrect / totalStudied) * 100) : null,
        totalDurationMins: Math.round(totalDuration / 60),
        lastActiveAt: lastSession,
      };
    })
    .sort((a, b) => (b.lastActiveAt ?? '').localeCompare(a.lastActiveAt ?? ''));

  // Login stats lookup (pre-aggregated by DB function)
  interface LoginStat {
    user_id: string;
    last_login_at: string;
    total_logins: number;
    logins_30d: number;
  }
  const loginStatsByUser = new Map<string, LoginStat>(
    (loginStats as LoginStat[]).map((s) => [s.user_id, s]),
  );

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

    const userLoginStats = loginStatsByUser.get(p.id);

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
      lastLoginAt: userLoginStats?.last_login_at ?? null,
      loginCount30d: userLoginStats?.logins_30d ?? 0,
      totalLogins: userLoginStats?.total_logins ?? 0,
    };
  });

  // ─── Travel Analytics ─────────────────────────────────────────

  // Total events & unique users
  const travelUniqueUsers = new Set(travelEvents.map((e) => e.user_id));

  // Events by feature
  const featureCounts: Record<string, number> = {};
  for (const ev of travelEvents) {
    featureCounts[ev.feature] = (featureCounts[ev.feature] || 0) + 1;
  }
  const featureBreakdown = Object.entries(featureCounts)
    .map(([feature, count]) => ({ feature, count }))
    .sort((a, b) => b.count - a.count);

  // Events over time (last 30 days)
  const travelByDate: Record<string, number> = {};
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo);
    d.setDate(d.getDate() + i + 1);
    travelByDate[d.toISOString().slice(0, 10)] = 0;
  }
  for (const ev of travelEvents) {
    if (ev.created_at) {
      const dateKey = ev.created_at.slice(0, 10);
      if (dateKey in travelByDate) travelByDate[dateKey]++;
    }
  }
  const travelOverTime = Object.entries(travelByDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  // Per-user travel activity
  const travelByUser = new Map<
    string,
    { total: number; features: Set<string>; lastAt: string | null }
  >();
  for (const ev of travelEvents) {
    const entry = travelByUser.get(ev.user_id);
    if (entry) {
      entry.total++;
      entry.features.add(ev.feature);
      if (ev.created_at && (!entry.lastAt || ev.created_at > entry.lastAt)) {
        entry.lastAt = ev.created_at;
      }
    } else {
      travelByUser.set(ev.user_id, {
        total: 1,
        features: new Set([ev.feature]),
        lastAt: ev.created_at,
      });
    }
  }
  const travelUsers = Array.from(travelByUser.entries())
    .map(([userId, stats]) => {
      const profile = profileById[userId];
      return {
        userId,
        username: profile?.username ?? 'Unknown',
        displayName: profile?.display_name ?? null,
        totalEvents: stats.total,
        featuresUsed: stats.features.size,
        lastActiveAt: stats.lastAt,
      };
    })
    .sort((a, b) => (b.lastActiveAt ?? '').localeCompare(a.lastActiveAt ?? ''));

  // Scenario category breakdown
  const scenarioCounts: Record<string, number> = {};
  for (const ev of travelEvents) {
    if (ev.feature === 'scenario' && ev.action === 'start') {
      const cat = (ev.metadata as Record<string, unknown>)?.category as string | undefined;
      if (cat) scenarioCounts[cat] = (scenarioCounts[cat] || 0) + 1;
    }
  }
  const scenarioBreakdown = Object.entries(scenarioCounts)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  const travelAnalytics = {
    overview: {
      totalEvents: travelEvents.length,
      uniqueUsers: travelUniqueUsers.size,
    },
    featureBreakdown,
    eventsOverTime: travelOverTime,
    users: travelUsers,
    scenarioBreakdown,
  };

  const overview = {
    totalUsers: profiles.length,
    totalDecks: decks.length,
    totalCards: cards.length,
    totalTodos: todos.length,
    totalWaitlist: waitlist.length,
    totalEventTypes: eventTypes.length,
  };

  return NextResponse.json({
    overview,
    users: userStats,
    waitlist,
    embedAnalytics,
    memberActivity,
    travelAnalytics,
    groups,
  });
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
