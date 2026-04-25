import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

import { isAdminEmail } from '@/lib/admin';

import { authenticateUser, getSupabaseConfig, handleProfileAction } from '../_lib/profile-actions';

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
  const [profilesRes, decksRes, cardsRes, todosRes, waitlistRes, eventTypesRes, embedEventsRes] =
    await Promise.all([
      client.from('profiles').select('id, username, display_name, color_scheme, created_at'),
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
    ]);

  const profiles = profilesRes.data ?? [];
  const decks = decksRes.data ?? [];
  const cards = cardsRes.data ?? [];
  const todos = todosRes.data ?? [];
  const waitlist = waitlistRes.data ?? [];
  const eventTypes = eventTypesRes.data ?? [];
  const embedEvents = embedEventsRes.data ?? [];

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

  return NextResponse.json({ overview, users: userStats, waitlist, embedAnalytics });
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
