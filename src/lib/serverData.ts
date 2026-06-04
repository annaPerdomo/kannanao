import 'server-only';

import { cache } from 'react';

import {
  dbDeckToApp,
  dbEventTypeToApp,
  dbTodoToApp,
  type HomeData,
  type InitialAuth,
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
 * Resolves the cookie-bound client + authenticated user once per request,
 * wrapped in React's `cache()` so repeated calls within a request share a
 * single client + getUser() round-trip.
 */
const getRequestAuth = cache(async () => {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
});

/** Server-side mirror of loadProfile (see supabase.ts) using a cookie-bound client. */
async function loadProfileServer(
  supabase: ServerClient,
  userId: string,
): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(
      'username, display_name, color_scheme, show_todo, home_sections, account_type, organizer_id, group_id, travel_main_view_mode, groups:group_id (show_leaderboard)',
    )
    .eq('id', userId)
    .single();
  if (error || !data) return null;
  const groupRow = data.groups as unknown as { show_leaderboard: boolean } | null;
  return {
    username: data.username,
    displayName: data.display_name ?? null,
    colorScheme: data.color_scheme ?? null,
    showTodo: data.show_todo !== false,
    homeSections: data.home_sections ?? null,
    accountType: data.account_type ?? 'organizer',
    organizerId: data.organizer_id ?? null,
    groupId: data.group_id ?? null,
    groupShowLeaderboard: groupRow?.show_leaderboard ?? true,
    travelMainViewMode: data.travel_main_view_mode ?? null,
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
    supabase.from('assignments').select('deck_id').eq('member_id', userId),
  ]);
  if (ownResult.error) return { decks: [], totalCount: 0 };

  const ownPinned = ownResult.data ?? [];
  const ownPinnedIds = new Set(ownPinned.map((d) => d.id));
  const assignedDeckIds = [
    ...new Set((assignedResult.data ?? []).map((a) => a.deck_id as string)),
  ].filter((id) => !ownPinnedIds.has(id));

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
 * `getUser()` is the authoritative check; the session is only used to seed the
 * client AuthContext.
 */
export async function getInitialAppData(): Promise<InitialAppData> {
  const { supabase, user } = await getRequestAuth();
  if (!user) {
    return { auth: { session: null, profile: null }, unreadCount: 0 };
  }

  const [{ data: sessionData }, profile, unreadCount] = await Promise.all([
    supabase.auth.getSession(),
    loadProfileServer(supabase, user.id),
    loadUnreadCountServer(supabase, user.id),
  ]);

  return { auth: { session: sessionData.session, profile }, unreadCount };
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

  // Line counts come from the trigger-maintained `line_count` column — no second
  // query to fetch (and count) line rows.
  const items = rows.map((row) => rowToOhanashikai(row, row.line_count ?? 0));
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
