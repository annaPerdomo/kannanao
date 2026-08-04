import { logger } from '@/lib/logger';

import { memberIdsFor } from './membership';
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
 * One group's weekly ranking, highest XP first. Shared by the single-board
 * route and the all-my-boards route so a learner in two groups sees the same
 * numbers on both surfaces.
 *
 * `groupId` null means the organizer's whole roster, which is what an account
 * that runs groups but has never created one still has.
 */
export async function buildLeaderboard(args: {
  organizerId: string;
  groupId: string | null;
}): Promise<LeaderboardEntry[]> {
  const sb = getServiceSupabase();

  // The roster plus the organizer, who ranks on their own group's board.
  const rosterIds = new Set(await memberIdsFor(args));
  rosterIds.add(args.organizerId);

  const { data: members } = await sb
    .from('profiles')
    .select('id, username, display_name, avatar')
    .in('id', [...rosterIds]);

  if (!members || members.length === 0) return [];

  const memberIds = members.map((m) => m.id);

  // Monday-start week, shared with the per-group weekly XP on home (see weekStart)
  const [sessionsRes, progressRes] = await Promise.all([
    sb
      .from('study_sessions')
      .select('user_id, xp_earned, cards_studied')
      .in('user_id', memberIds)
      .gte('started_at', weekStart().toISOString()),
    sb.from('user_progress').select('user_id, streak_days, level').in('user_id', memberIds),
  ]);

  if (sessionsRes.error) {
    logger.error('Failed to fetch leaderboard sessions', {
      groupId: args.groupId,
      error: sessionsRes.error.message,
    });
  }

  const progressMap = new Map((progressRes.data ?? []).map((p) => [p.user_id, p]));

  const weeklyStats = new Map<string, { xp: number; cards: number }>();
  for (const s of sessionsRes.data ?? []) {
    const existing = weeklyStats.get(s.user_id) ?? { xp: 0, cards: 0 };
    existing.xp += s.xp_earned ?? 0;
    existing.cards += s.cards_studied ?? 0;
    weeklyStats.set(s.user_id, existing);
  }

  return members
    .map((m) => {
      const weekly = weeklyStats.get(m.id) ?? { xp: 0, cards: 0 };
      const prog = progressMap.get(m.id);
      return {
        id: m.id,
        username: m.username,
        displayName: m.display_name,
        avatar: m.avatar,
        weeklyXp: weekly.xp,
        weeklyCards: weekly.cards,
        streakDays: prog?.streak_days ?? 0,
        level: prog?.level ?? 1,
      };
    })
    .sort((a, b) => b.weeklyXp - a.weeklyXp);
}
