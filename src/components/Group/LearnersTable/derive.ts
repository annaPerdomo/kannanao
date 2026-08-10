import type { GroupMember } from '@/hooks/useGroup';

import { daysSinceActive, STALE_DAYS } from '../memberActivity';

export type SortKey = 'status' | 'streak' | 'cards' | 'reviews' | 'accuracy';
export type SortDirection = 'asc' | 'desc';

export const DEFAULT_SORT_KEY: SortKey = 'status';
/** Largest days-since-active first — the stalest learner leads, same as the old panel. */
export const DEFAULT_SORT_DIRECTION: SortDirection = 'desc';

export type LearnerStatus =
  | { kind: 'activeToday' }
  | { kind: 'activeRecently'; days: number }
  | { kind: 'inactive'; days: number }
  | { kind: 'neverStarted' };

export function learnerStatus(lastActive: string | null, now = Date.now()): LearnerStatus {
  if (!lastActive) return { kind: 'neverStarted' };
  const days = Math.floor(daysSinceActive(lastActive, now));
  if (days < 1) return { kind: 'activeToday' };
  if (days < STALE_DAYS) return { kind: 'activeRecently', days };
  return { kind: 'inactive', days };
}

/** Fraction correct, or `null` when nothing has been studied yet (avoids ÷0). */
export function accuracyFraction(
  member: Pick<GroupMember, 'totalCorrect' | 'totalCardsStudied'>,
): number | null {
  if (member.totalCardsStudied === 0) return null;
  return member.totalCorrect / member.totalCardsStudied;
}

export type AccuracyTone = 'success' | 'warning' | 'error';

export function accuracyTone(fraction: number): AccuracyTone {
  const pct = fraction * 100;
  if (pct >= 80) return 'success';
  if (pct >= 60) return 'warning';
  return 'error';
}

function sortRank(member: GroupMember, key: SortKey, now: number): number {
  if (key === 'status') return daysSinceActive(member.lastActive, now);
  if (key === 'streak') return member.streakDays;
  if (key === 'cards') return member.totalCardsStudied;
  if (key === 'reviews') return member.reviewsWaiting ?? -1;
  return accuracyFraction(member) ?? -1;
}

/** Ascending by rank, reversed for 'desc'. Does not mutate the input array. */
export function sortLearners(
  members: GroupMember[],
  key: SortKey,
  direction: SortDirection,
  now = Date.now(),
): GroupMember[] {
  const ranked = [...members].sort((a, b) => sortRank(a, key, now) - sortRank(b, key, now));
  return direction === 'asc' ? ranked : ranked.reverse();
}
