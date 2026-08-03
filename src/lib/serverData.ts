import 'server-only';

import { cache } from 'react';

import { parseLocale } from '@/i18n/config';
import { availableNowFilter } from '@/lib/assignmentAvailability';
import {
  dbDeckToApp,
  dbEventTypeToApp,
  dbTodoToApp,
  type HomeData,
  type InitialAuth,
  pickFirstLines,
  rowToOhanashikai,
  type UserProfile,
} from '@/lib/dbMappers';
import { getServerSupabase } from '@/lib/supabaseServer';
import type { Deck } from '@/types/deck';
import type { Ohanashikai } from '@/types/ohanashikai';
import type { EntryType, Todo } from '@/types/todo';

type ServerClient = Awaited<ReturnType<typeof getServerSupabase>>;

/**
 * The minimal, shell-critical data the root layout blocks on: auth (session +
 * profile, needed for the correct theme and to render authed content in the
 * initial HTML) plus the cheap unread-message head count for the nav badge.
 * Heavier per-user data (XP progress, shop) is intentionally NOT here — it loads
 * client-side via its hooks' loading states so the shell can paint immediately.
 */
export interface InitialAppData {
  auth: InitialAuth;
  unreadCount: number;
}

/**
 * Resolves the cookie-bound client + current session once per request, wrapped
 * in React's `cache()` so repeated calls within a request share one resolution.
 *
 * Uses `getSession()` (decodes the session from the request cookie locally) over
 * `getUser()` (a round-trip to the auth server) to keep a network hop off the
 * first-paint critical path. The middleware keeps the cookie's token fresh, and
 * every query seeded from this is RLS-protected at Postgres — the JWT signature
 * is verified there — so a tampered cookie simply yields no rows rather than
 * leaking data. This mirrors the client `useProgress` pattern.
 */
const getRequestAuth = cache(async () => {
  const supabase = await getServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return { supabase, session, user: session?.user ?? null };
});

/** Server-side mirror of loadProfile (see supabase.ts) using a cookie-bound client. */
async function loadProfileServer(
  supabase: ServerClient,
  userId: string,
): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(
      'username, display_name, color_scheme, show_todo, home_sections, review_reminders, avatar, account_type, organizer_id, group_id, travel_main_view_mode, locale, groups:group_id (show_leaderboard)',
    )
    .eq('id', userId)
    .single();
  if (error || !data) return null;
  const groupRow = data.groups as unknown as { show_leaderboard: boolean } | null;
  return {
    username: data.username,
    displayName: data.display_name ?? null,
    avatar: data.avatar ?? null,
    colorScheme: data.color_scheme ?? null,
    showTodo: data.show_todo !== false,
    homeSections: data.home_sections ?? null,
    reviewReminders: data.review_reminders !== false,
    accountType: data.account_type ?? 'organizer',
    organizerId: data.organizer_id ?? null,
    groupId: data.group_id ?? null,
    groupShowLeaderboard: groupRow?.show_leaderboard ?? true,
    travelMainViewMode: data.travel_main_view_mode ?? null,
    locale: parseLocale(data.locale),
  };
}

/** Cheap unread-message count for the nav badge. */
async function loadUnreadCountServer(supabase: ServerClient, userId: string): Promise<number> {
  const { count } = await supabase
    .from('direct_messages')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_id', userId)
    .is('read_at', null);
  return count ?? 0;
}

/**
 * The home dashboard only renders *pinned* decks, so fetch just those (own +
 * pinned assigned) instead of every deck and every card row. A cheap head count
 * gives the total so the UI can still tell "no decks yet" from "none pinned".
 */
async function loadDecksServer(
  supabase: ServerClient,
  userId: string,
): Promise<{ decks: Deck[]; totalCount: number }> {
  const [ownResult, ownCountResult, assignedResult] = await Promise.all([
    supabase
      .from('decks')
      .select('*')
      .eq('user_id', userId)
      .eq('pinned', true)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true }),
    supabase.from('decks').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase
      .from('assignments')
      .select('deck_id, decks(user_id)')
      .eq('member_id', userId)
      .or(availableNowFilter()),
  ]);
  if (ownResult.error) return { decks: [], totalCount: 0 };

  const ownPinned = ownResult.data ?? [];
  // De-dupe assigned decks against *all* owned decks (not just pinned ones): the
  // assignments API doesn't validate deck ownership, so an organizer could assign
  // a member a deck they already own. Counting it under both `ownCount` and the
  // assigned list would double it in `totalCount`. Filtering by the joined deck
  // owner drops those rows entirely.
  const assignedDeckIds = [
    ...new Set(
      (assignedResult.data ?? [])
        .filter((a) => (a.decks as unknown as { user_id: string } | null)?.user_id !== userId)
        .map((a) => a.deck_id as string),
    ),
  ];

  // Only assigned decks that are *also* pinned show on the dashboard.
  let assignedPinned: typeof ownPinned = [];
  if (assignedDeckIds.length > 0) {
    const { data } = await supabase
      .from('decks')
      .select('*')
      .in('id', assignedDeckIds)
      .eq('pinned', true)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true });
    assignedPinned = data ?? [];
  }

  const allPinned = [...ownPinned, ...assignedPinned];
  // Card counts come from the trigger-maintained `card_count` column, so there's
  // no second query to fetch (and count) card rows.
  const decks = allPinned.map((deck) => dbDeckToApp(deck, deck.card_count ?? 0, userId));
  const totalCount = (ownCountResult.count ?? 0) + assignedDeckIds.length;
  return { decks, totalCount };
}

/**
 * Resolves the shell-critical data the root layout blocks on: auth (session +
 * profile) and the unread-message badge count. This is deliberately small so the
 * app shell can paint as fast as possible; heavier per-user data (XP progress,
 * shop purchases) loads client-side via its hooks instead of gating first paint.
 * Auth comes from the cookie-bound session (see `getRequestAuth` for why
 * `getSession()` rather than `getUser()`); every downstream query is RLS-gated.
 */
export async function getInitialAppData(): Promise<InitialAppData> {
  const { supabase, session, user } = await getRequestAuth();
  if (!user) {
    return { auth: { session: null, profile: null }, unreadCount: 0 };
  }

  const [profile, unreadCount] = await Promise.all([
    loadProfileServer(supabase, user.id),
    loadUnreadCountServer(supabase, user.id),
  ]);

  return { auth: { session, profile }, unreadCount };
}

/** Server-fetches the home dashboard's decks (shares the cached per-request user). */
/**
 * Like loadDecksServer: the dashboard only renders *pinned* speeches, so fetch
 * just those (+ their line counts) plus a cheap total head count for empty-state
 * copy, instead of every speech and every line row.
 */
async function loadOhanashikaisServer(
  supabase: ServerClient,
  userId: string,
): Promise<{ items: Ohanashikai[]; totalCount: number }> {
  const [pinnedResult, countResult] = await Promise.all([
    supabase
      .from('ohanashikais')
      .select('*')
      .eq('user_id', userId)
      .eq('pinned', true)
      .order('created_at', { ascending: true }),
    supabase
      .from('ohanashikais')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
  ]);
  if (pinnedResult.error) return { items: [], totalCount: 0 };
  const rows = pinnedResult.data ?? [];
  if (rows.length === 0) return { items: [], totalCount: countResult.count ?? 0 };

  // The home row shows each speech's opening line, so fetch the lines of the
  // *pinned* speeches only — one query for all of them, not one per speech.
  const { data: lineRows } = await supabase
    .from('ohanashikai_lines')
    .select('ohanashikai_id, text, order_index')
    .in(
      'ohanashikai_id',
      rows.map((r) => r.id),
    );
  const firstLines = pickFirstLines(lineRows ?? []);

  // Line counts come from the trigger-maintained `line_count` column — no second
  // query to fetch (and count) line rows.
  const items = rows.map((row) =>
    rowToOhanashikai(row, row.line_count ?? 0, firstLines.get(row.id)),
  );
  return { items, totalCount: countResult.count ?? 0 };
}

/** Server-side mirror of loadTodos (see supabase.ts). */
async function loadTodosServer(supabase: ServerClient, userId: string): Promise<Todo[]> {
  const { data, error } = await supabase
    .from('todos')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true });
  if (error) return [];
  return (data ?? []).map(dbTodoToApp);
}

/** Server-side mirror of loadEventTypes (see supabase.ts). */
async function loadEventTypesServer(supabase: ServerClient, userId: string): Promise<EntryType[]> {
  const { data, error } = await supabase
    .from('event_types')
    .select('*')
    .eq('user_id', userId)
    .order('name', { ascending: true });
  if (error) return [];
  return (data ?? []).map(dbEventTypeToApp);
}

export async function getHomeData(): Promise<HomeData> {
  const { supabase, user } = await getRequestAuth();
  if (!user)
    return {
      decks: null,
      ohanashikais: null,
      todos: null,
      eventTypes: null,
      totalDeckCount: 0,
      totalOhanashikaiCount: 0,
    };

  const [decksResult, ohanashikaisResult, todos, eventTypes] = await Promise.all([
    loadDecksServer(supabase, user.id),
    loadOhanashikaisServer(supabase, user.id),
    loadTodosServer(supabase, user.id),
    loadEventTypesServer(supabase, user.id),
  ]);
  return {
    decks: decksResult.decks,
    ohanashikais: ohanashikaisResult.items,
    todos,
    eventTypes,
    totalDeckCount: decksResult.totalCount,
    totalOhanashikaiCount: ohanashikaisResult.totalCount,
  };
}
