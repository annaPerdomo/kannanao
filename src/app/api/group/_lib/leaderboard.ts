import { logger } from '@/lib/logger';

import { getServiceSupabase } from './serviceSupabase';
import { weekStart } from './weekStart';

export interface LeaderboardEntry {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  weeklyXp: number;
  weeklyCards: number;
  streakDays: number;
  level: number;
}

/**
 * `groupId` null means the organizer's whole roster, which is what an account
 * that runs groups but has never created one still has.
 */
export interface BoardSpec {
  organizerId: string;
  groupId: string | null;
}

interface WeeklyStat {
  xp: number;
  cards: number;
}

/**
 * Several groups' weekly rankings, highest XP first, in a fixed four queries no
 * matter how many boards are asked for.
 *
 * Built as a batch rather than a board at a time because an account can run a
 * dozen groups: per-board that is four round trips each on every dashboard
 * load, and the home page asks for all of them at once.
 */
export async function buildLeaderboards(specs: BoardSpec[]): Promise<LeaderboardEntry[][]> {
  if (specs.length === 0) return [];

  const sb = getServiceSupabase();
  const organizerIds = [...new Set(specs.map((s) => s.organizerId))];

  const { data: membershipRows, error: membershipError } = await sb
    .from('group_members')
    .select('member_id, group_id, organizer_id')
    .in('organizer_id', organizerIds);

  if (membershipError) {
    logger.error('Failed to fetch leaderboard rosters', { error: membershipError.message });
  }

  // The roster plus the organizer, who ranks on their own group's board.
  const rosters = specs.map((spec) => {
    const ids = new Set<string>([spec.organizerId]);
    for (const row of membershipRows ?? []) {
      if (row.organizer_id !== spec.organizerId) continue;
      if (spec.groupId && row.group_id !== spec.groupId) continue;
      ids.add(row.member_id as string);
    }
    return ids;
  });

  const everyone = [...new Set(rosters.flatMap((ids) => [...ids]))];

  const [profilesRes, sessionsRes, progressRes] = await Promise.all([
    sb.from('profiles').select('id, username, display_name, avatar').in('id', everyone),
    // Monday-start week, shared with the per-group weekly XP on home (see weekStart)
    sb
      .from('study_sessions')
      .select('user_id, xp_earned, cards_studied')
      .in('user_id', everyone)
      .gte('started_at', weekStart().toISOString()),
    sb.from('user_progress').select('user_id, streak_days, level').in('user_id', everyone),
  ]);

  if (sessionsRes.error) {
    logger.error('Failed to fetch leaderboard sessions', { error: sessionsRes.error.message });
  }

  const profiles = new Map((profilesRes.data ?? []).map((p) => [p.id as string, p]));
  const progress = new Map((progressRes.data ?? []).map((p) => [p.user_id as string, p]));

  const weekly = new Map<string, WeeklyStat>();
  for (const s of sessionsRes.data ?? []) {
    const existing = weekly.get(s.user_id) ?? { xp: 0, cards: 0 };
    existing.xp += s.xp_earned ?? 0;
    existing.cards += s.cards_studied ?? 0;
    weekly.set(s.user_id, existing);
  }

  return rosters.map((ids) =>
    [...ids]
      .map((id) => profiles.get(id))
      .filter((p): p is NonNullable<typeof p> => !!p)
      .map((p) => {
        const stat = weekly.get(p.id as string) ?? { xp: 0, cards: 0 };
        const prog = progress.get(p.id as string);
        return {
          id: p.id as string,
          username: p.username as string,
          displayName: (p.display_name as string | null) ?? null,
          avatar: (p.avatar as string | null) ?? null,
          weeklyXp: stat.xp,
          weeklyCards: stat.cards,
          streakDays: (prog?.streak_days as number | undefined) ?? 0,
          level: (prog?.level as number | undefined) ?? 1,
        };
      })
      .sort((a, b) => b.weeklyXp - a.weeklyXp),
  );
}

/** One group's ranking — the same numbers the all-my-boards route shows. */
export async function buildLeaderboard(args: BoardSpec): Promise<LeaderboardEntry[]> {
  const [entries] = await buildLeaderboards([args]);
  return entries ?? [];
}
