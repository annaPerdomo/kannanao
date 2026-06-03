import 'server-only';

import { cache } from 'react';

import type { InitialAuth, UserProfile } from '@/lib/dbMappers';
import { getServerSupabase } from '@/lib/supabaseServer';

type ServerClient = Awaited<ReturnType<typeof getServerSupabase>>;

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
