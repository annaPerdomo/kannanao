import type { Assignment } from '@/hooks/useAssignments';
import { isAvailable } from '@/lib/assignmentAvailability';
import { localDateString } from '@/lib/chest';
import { daysSince } from '@/lib/dailyPractice';

/** How recently a now-complete assignment's deck still counts as "this week's lesson". */
export const RECENTLY_HANDED_OUT_DAYS = 7;

export function completedWithinDays(completedAt: string, today: string, days: number): boolean {
  const completedDate = new Date(completedAt);
  if (Number.isNaN(completedDate.getTime())) return false;
  const diff = daysSince(localDateString(completedDate), today);
  return diff !== null && diff >= 0 && diff <= days;
}

/** Deck ids to rank first: open homework, plus the newest lesson even if just finished. */
export function priorityDeckIds(assignments: Assignment[], today: string): string[] {
  const ids = new Set<string>();
  const available = assignments.filter((a) => a.deck_id && isAvailable(a.available_on, today));
  for (const a of available) {
    if (!a.completed_at) ids.add(a.deck_id as string);
  }
  const newest = [...available].sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0];
  if (
    newest?.deck_id &&
    (!newest.completed_at ||
      completedWithinDays(newest.completed_at, today, RECENTLY_HANDED_OUT_DAYS))
  ) {
    ids.add(newest.deck_id);
  }
  return [...ids];
}
