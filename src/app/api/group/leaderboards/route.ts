import { type NextRequest, NextResponse } from 'next/server';

import { logger } from '@/lib/logger';

import { rateLimit } from '../../_lib/rateLimit';
import {
  type AuthenticatedUser,
  requireAuthenticatedUser,
} from '../../_lib/requireAuthenticatedUser';
import { buildLeaderboards, type LeaderboardEntry } from '../_lib/leaderboard';
import { membershipsOf } from '../_lib/membership';
import { getServiceSupabase } from '../_lib/serviceSupabase';

const RATE_LIMIT = { windowMs: 60_000, max: 20 };

export interface GroupBoard {
  groupId: string;
  groupName: string;
  groupEmoji: string | null;
  entries: LeaderboardEntry[];
}

/**
 * GET — every leaderboard this account belongs on.
 *
 * One board per group, never a merged one: someone taking an advanced
 * conversation group and a business Japanese group is ranked against the people
 * in each, and pooling them would compare classmates who never meet. Covers both
 * roles, because an account can run its own groups and learn in other people's.
 *
 * Groups whose organizer turned the leaderboard off are left out entirely.
 */
export async function GET(req: NextRequest) {
  const limited = await rateLimit(req, RATE_LIMIT);
  if (limited) return limited;

  const authCheck = await requireAuthenticatedUser(req);
  if (authCheck instanceof NextResponse) return authCheck;
  const user = authCheck as AuthenticatedUser;

  const sb = getServiceSupabase();

  const [memberships, ownGroupsRes] = await Promise.all([
    membershipsOf(user.id),
    sb
      .from('groups')
      .select('id, name, emoji, show_leaderboard')
      .eq('organizer_id', user.id)
      .order('created_at', { ascending: true }),
  ]);

  if (ownGroupsRes.error) {
    logger.error('Failed to list own groups for leaderboards', {
      route: '/api/group/leaderboards',
      error: ownGroupsRes.error.message,
    });
  }

  // Groups learned in, then groups run. A group can appear in both lists when
  // an organizer joined one of their own — keyed so it is built once.
  const organizerByGroup = new Map<string, string>();
  for (const m of memberships) organizerByGroup.set(m.group_id, m.organizer_id);
  for (const g of ownGroupsRes.data ?? []) organizerByGroup.set(g.id as string, user.id);

  if (organizerByGroup.size === 0) return NextResponse.json([]);

  // Own groups already arrived above; only the ones learned in still need names.
  const own = new Map((ownGroupsRes.data ?? []).map((g) => [g.id as string, g]));
  const missing = [...organizerByGroup.keys()].filter((id) => !own.has(id));
  const { data: joined } = missing.length
    ? await sb.from('groups').select('id, name, emoji, show_leaderboard').in('id', missing)
    : { data: [] };

  const visible = [...(joined ?? []), ...own.values()].filter((g) => g.show_leaderboard !== false);

  const rankings = await buildLeaderboards(
    visible.map((g) => ({
      organizerId: organizerByGroup.get(g.id as string)!,
      groupId: g.id as string,
    })),
  );

  const boards = visible.map((g, i) => ({
    groupId: g.id as string,
    groupName: (g.name as string) ?? '',
    groupEmoji: (g.emoji as string | null) ?? null,
    entries: rankings[i] ?? [],
  }));

  // A board of one is the learner looking at themselves — nothing to compare.
  return NextResponse.json(boards.filter((b) => b.entries.length > 1));
}
