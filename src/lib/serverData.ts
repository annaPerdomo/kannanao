import 'server-only';

import { cache } from 'react';

import type { Achievement, StudySession, UserProgress } from '@/hooks/useProgress';
import {
  dbDeckToApp,
  dbEventTypeToApp,
  dbTodoToApp,
  type HomeData,
  type InitialAuth,
  type InitialProgress,
  type InitialShop,
  rowToOhanashikai,
  type UserProfile,
} from '@/lib/dbMappers';
import { getServerSupabase } from '@/lib/supabaseServer';
import type { Deck } from '@/types/deck';
import type { Ohanashikai } from '@/types/ohanashikai';
import type { UserPurchase } from '@/types/shop';
import type { EntryType, Todo } from '@/types/todo';

type ServerClient = Awaited<ReturnType<typeof getServerSupabase>>;

/** Everything the root layout seeds into the app-wide providers. */
export interface InitialAppData {
  auth: InitialAuth;
  progress: InitialProgress | null;
  shop: InitialShop | null;
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

/** Server-side mirror of useProgress's fetchAll (the 3 progress queries). */
async function loadProgressServer(
  supabase: ServerClient,
  userId: string,
): Promise<InitialProgress | null> {
  const [{ data: prog }, { data: ach }, { data: sess }] = await Promise.all([
    supabase.from('user_progress').select('*').eq('user_id', userId).maybeSingle(),
    supabase
      .from('user_achievements')
      .select('*')
      .eq('user_id', userId)
      .order('unlocked_at', { ascending: false }),
    supabase
      .from('study_sessions')
      .select('*')
      .eq('user_id', userId)
      .gte('started_at', new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString())
      .order('started_at', { ascending: false })
      .limit(200),
  ]);
  // A brand-new user has no progress row yet — return null so the client runs
  // its create-on-first-load path instead of being seeded with nothing.
  if (!prog) return null;
  return {
    progress: prog as UserProgress,
    achievements: (ach ?? []) as Achievement[],
    recentSessions: (sess ?? []) as StudySession[],
  };
}

/** Server-side mirror of useShop's fetchShopData (purchases + equipped map). */
async function loadShopServer(supabase: ServerClient, userId: string): Promise<InitialShop> {
  const [{ data: purchaseRows }, { data: equippedRows }] = await Promise.all([
    supabase.from('user_purchases').select('*').eq('user_id', userId),
    supabase.from('user_equipped').select('*').eq('user_id', userId),
  ]);
  const equipped: Record<string, string> = {};
  (equippedRows ?? []).forEach((row: { slot: string; item_key: string }) => {
    equipped[row.slot] = row.item_key;
  });
  return { purchases: (purchaseRows ?? []) as UserPurchase[], equipped };
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
  const allDeckIds = allPinned.map((d) => d.id);

  // Card counts are now scoped to the handful of pinned decks, not every deck.
  let cards: Array<{ deck_id: string | number }> = [];
  if (allDeckIds.length > 0) {
    const { data: cardRows, error } = await supabase
      .from('cards')
      .select('deck_id')
      .in('deck_id', allDeckIds);
    if (error) return { decks: [], totalCount: 0 };
    cards = cardRows ?? [];
  }

  const countByDeck = new Map<string, number>();
  for (const card of cards) {
    const key = String(card.deck_id);
    countByDeck.set(key, (countByDeck.get(key) ?? 0) + 1);
  }
  const decks = allPinned.map((deck) => dbDeckToApp(deck, countByDeck.get(deck.id) ?? 0, userId));
  const totalCount = (ownCountResult.count ?? 0) + assignedDeckIds.length;
  return { decks, totalCount };
}

/**
 * Resolves auth + the app-wide provider data (progress, shop, unread count) on
 * the server so the root layout can seed every page's global providers. This
 * replaces ~6 client requests per page load with one parallel server batch, and
 * lets authenticated content render in the initial HTML. `getUser()` is the
 * authoritative check; the session object is only used to seed the client.
 */
export async function getInitialAppData(): Promise<InitialAppData> {
  const { supabase, user } = await getRequestAuth();
  if (!user) {
    return { auth: { session: null, profile: null }, progress: null, shop: null, unreadCount: 0 };
  }

  const [{ data: sessionData }, profile, progress, shop, unreadCount] = await Promise.all([
    supabase.auth.getSession(),
    loadProfileServer(supabase, user.id),
    loadProgressServer(supabase, user.id),
    loadShopServer(supabase, user.id),
    loadUnreadCountServer(supabase, user.id),
  ]);

  return { auth: { session: sessionData.session, profile }, progress, shop, unreadCount };
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

  let lineCounts: Array<{ ohanashikai_id: string }> = [];
  if (rows.length > 0) {
    const ids = rows.map((r) => r.id);
    const { data } = await supabase
      .from('ohanashikai_lines')
      .select('ohanashikai_id')
      .in('ohanashikai_id', ids);
    lineCounts = data ?? [];
  }

  const countMap: Record<string, number> = {};
  lineCounts.forEach((l) => {
    countMap[l.ohanashikai_id] = (countMap[l.ohanashikai_id] ?? 0) + 1;
  });
  const items = rows.map((row) => rowToOhanashikai(row, countMap[row.id] ?? 0));
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
