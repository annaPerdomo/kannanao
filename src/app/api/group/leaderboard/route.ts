import { type NextRequest, NextResponse } from 'next/server';

import { getProfileForUserResult, getUserFromTokenResult } from '../../_lib/authCache';
import { backendUnavailable } from '../../_lib/backendUnavailable';
import { rateLimit } from '../../_lib/rateLimit';
import { buildLeaderboard } from '../_lib/leaderboard';
import { membershipsOf } from '../_lib/membership';
import { getServiceSupabase } from '../_lib/serviceSupabase';

const RATE_LIMIT = { windowMs: 60_000, max: 20 };

/**
 * GET — weekly group leaderboard.
 * Accessible by both organizers and members of the same group.
 */
export async function GET(req: NextRequest) {
  const limited = await rateLimit(req, RATE_LIMIT);
  if (limited) return limited;

  // Authenticate the user (organizer or member)
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
  }

  const token = authHeader.slice(7);
  const auth = await getUserFromTokenResult(token);
  if (auth.error) return backendUnavailable(auth.error, 'group/leaderboard.user');
  const user = auth.value;

  if (!user) {
    return NextResponse.json({ error: 'Invalid or expired token.' }, { status: 401 });
  }

  const sb = getServiceSupabase();

  // Get the user's profile to determine group membership (cached per user)
  const lookup = await getProfileForUserResult(user.id, token);
  if (lookup.error) return backendUnavailable(lookup.error, 'group/leaderboard.profile');

  const profile = lookup.value;
  if (!profile) {
    return NextResponse.json({ error: 'Profile not found.' }, { status: 404 });
  }

  // The group root. Without a ?groupId= this is the home leaderboard: prefer
  // the group the account learns in, fall back to its own when it isn't in one.
  const requestedGroupId = req.nextUrl.searchParams.get('groupId');
  const memberships = await membershipsOf(profile.id);
  let organizerId: string | null;
  let groupId: string | null;

  if (requestedGroupId) {
    const { data: group } = await sb
      .from('groups')
      .select('organizer_id')
      .eq('id', requestedGroupId)
      .single();
    if (!group) {
      return NextResponse.json({ error: 'Group not found.' }, { status: 404 });
    }
    // ?groupId= is caller input and the roster below follows whichever organizer
    // it resolves to, so unchecked it hands any signed-in account the names and
    // study stats of a group they have nothing to do with.
    const inGroup = memberships.some((m) => m.group_id === requestedGroupId);
    if (group.organizer_id !== profile.id && !inGroup) {
      return NextResponse.json({ error: 'Not part of this group.' }, { status: 403 });
    }
    organizerId = group.organizer_id;
    groupId = requestedGroupId;
  } else {
    // No ?groupId= is the home leaderboard, which shows one board. A learner in
    // several groups gets their primary one — the profile pointer — and falls
    // back to any membership if that pointer is stale.
    const primary =
      memberships.find((m) => m.group_id === profile.group_id) ?? memberships[0] ?? null;
    organizerId = primary?.organizer_id ?? profile.id;
    groupId = primary?.group_id ?? null;
  }

  if (!organizerId) {
    return NextResponse.json({ error: 'Not part of a group.' }, { status: 400 });
  }

  // Check if the group has the leaderboard enabled
  if (groupId) {
    const { data: group } = await sb
      .from('groups')
      .select('show_leaderboard')
      .eq('id', groupId)
      .single();
    if (group?.show_leaderboard === false) {
      return NextResponse.json([]);
    }
  }

  return NextResponse.json(await buildLeaderboard({ organizerId, groupId }));
}
