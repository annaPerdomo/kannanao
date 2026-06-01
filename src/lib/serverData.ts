import 'server-only';

import { cache } from 'react';

import { dbDeckToApp, type InitialAuth, type UserProfile } from '@/lib/dbMappers';
import { getServerSupabase } from '@/lib/supabaseServer';
import type { Deck } from '@/types/deck';

type ServerClient = Awaited<ReturnType<typeof getServerSupabase>>;

/**
 * Resolves the cookie-bound client + authenticated user once per request.
 * Wrapped in React's `cache()` so the layout (getInitialAuth) and the home page
 * (getHomeDecks) share a single client + getUser() round-trip instead of two.
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

/** Server-side mirror of loadDecks (see supabase.ts) using a cookie-bound client. */
async function loadDecksServer(supabase: ServerClient, userId: string): Promise<Deck[]> {
  const [ownResult, assignedResult] = await Promise.all([
    supabase
      .from('decks')
      .select('*')
      .eq('user_id', userId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true }),
    supabase.from('assignments').select('deck_id').eq('member_id', userId),
  ]);

  const deckRows = ownResult.data;
  if (ownResult.error) return [];
  const assignedRows = assignedResult.data;

  const ownDeckIds = new Set((deckRows ?? []).map((d) => d.id));
  const assignedDeckIds = (assignedRows ?? [])
    .map((a) => a.deck_id as string)
    .filter((id) => !ownDeckIds.has(id));

  let assignedDecks: NonNullable<typeof deckRows> = [];
  if (assignedDeckIds.length > 0) {
    const { data } = await supabase
      .from('decks')
      .select('*')
      .in('id', assignedDeckIds)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true });
    assignedDecks = data ?? [];
  }

  const allDecks = [...(deckRows ?? []), ...assignedDecks];
  const allDeckIds = allDecks.map((d) => d.id);

  let cards: Array<{ deck_id: string | number }> = [];
  if (allDeckIds.length > 0) {
    const { data: cardRows, error } = await supabase
      .from('cards')
      .select('deck_id')
      .in('deck_id', allDeckIds);
    if (error) return [];
    cards = cardRows ?? [];
  }

  const countByDeck = new Map<string, number>();
  for (const card of cards) {
    const key = String(card.deck_id);
    countByDeck.set(key, (countByDeck.get(key) ?? 0) + 1);
  }

  return allDecks.map((deck) => dbDeckToApp(deck, countByDeck.get(deck.id) ?? 0, userId));
}

/**
 * Resolves the auth session + profile on the server (from cookies) so the root
 * layout can seed AuthContext. This lets the app render authenticated content in
 * the initial HTML instead of flashing a loading spinner while the client
 * re-checks auth. `getUser()` is the authoritative check; the session object is
 * only used to seed the client.
 */
export async function getInitialAuth(): Promise<InitialAuth> {
  const { supabase, user } = await getRequestAuth();
  if (!user) return { session: null, profile: null };

  const [{ data: sessionData }, profile] = await Promise.all([
    supabase.auth.getSession(),
    loadProfileServer(supabase, user.id),
  ]);

  return { session: sessionData.session, profile };
}

/**
 * Server-fetches the signed-in user's decks for the home dashboard's first
 * paint. Returns null when signed out (the page renders the landing instead).
 */
export async function getHomeDecks(): Promise<Deck[] | null> {
  const { supabase, user } = await getRequestAuth();
  if (!user) return null;
  return loadDecksServer(supabase, user.id);
}
