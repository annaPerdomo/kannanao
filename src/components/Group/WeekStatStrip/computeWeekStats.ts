import type { GroupMember } from '@/hooks/useGroup';
import type { GroupActivity } from '@/hooks/useGroupActivity';

import { sumLastDays, WEEK_DAYS } from '../activityWeek';
import { daysSinceActive, STALE_DAYS } from '../memberActivity';

export interface WeekStats {
  learnerCount: number;
  activeCount: number;
  cardsThisWeek: number;
  /** Percent, 0-100, or `null` when nobody studied this week (avoids ÷0). */
  accuracyPct: number | null;
  /** This week's accuracy minus last week's, in points — `null` when last week has no data. */
  accuracyDeltaPct: number | null;
  studySecs: number;
  bestStreak: { name: string; days: number } | null;
  masteredCount: number;
  groupXp: number;
}

function accuracyPctFor(cards: number, correct: number): number | null {
  return cards > 0 ? Math.round((correct / cards) * 100) : null;
}

/** Everything in the "This week" stat strip, derived from the roster + 14-day activity window. */
export function computeWeekStats(
  members: GroupMember[],
  activity: GroupActivity | null,
  now = Date.now(),
): WeekStats {
  const cardsSeries = activity?.totals.cards ?? [];
  const correctSeries = activity?.totals.correct ?? [];
  const durationSeries = activity?.totals.durationSecs ?? [];
  const len = cardsSeries.length;
  const prevWeek = { start: Math.max(0, len - 2 * WEEK_DAYS), end: Math.max(0, len - WEEK_DAYS) };
  const sumRange = (series: number[]) =>
    series.slice(prevWeek.start, prevWeek.end).reduce((a, b) => a + b, 0);

  const cardsThisWeek = sumLastDays(cardsSeries, WEEK_DAYS);
  const correctThisWeek = sumLastDays(correctSeries, WEEK_DAYS);
  const cardsPrevWeek = sumRange(cardsSeries);
  const correctPrevWeek = sumRange(correctSeries);

  const accuracyPct = accuracyPctFor(cardsThisWeek, correctThisWeek);
  const accuracyPrevPct = accuracyPctFor(cardsPrevWeek, correctPrevWeek);
  const accuracyDeltaPct =
    accuracyPct !== null && accuracyPrevPct !== null ? accuracyPct - accuracyPrevPct : null;

  const bestStreakMember = members.reduce<GroupMember | null>(
    (best, m) => (!best || m.streakDays > best.streakDays ? m : best),
    null,
  );

  return {
    learnerCount: members.length,
    activeCount: members.filter((m) => daysSinceActive(m.lastActive, now) < STALE_DAYS).length,
    cardsThisWeek,
    accuracyPct,
    accuracyDeltaPct,
    studySecs: sumLastDays(durationSeries, WEEK_DAYS),
    bestStreak: bestStreakMember
      ? {
          name: bestStreakMember.displayName || bestStreakMember.username,
          days: bestStreakMember.streakDays,
        }
      : null,
    masteredCount: members.reduce((sum, m) => sum + m.masteryStrong, 0),
    groupXp: members.reduce((sum, m) => sum + m.totalXp, 0),
  };
}
