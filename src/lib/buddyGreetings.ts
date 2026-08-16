import { canEarn, type FriendshipDates, todayOpportunities } from './friendship';
import { heartsToNext } from './friendshipMilestones';

export type GreetingKind = 'backAfterBreak' | 'allDone' | 'nearMilestone' | 'adventureNotDone';

export const GREETING_BREAK_DAYS = 3;

function utcMidnight(localDate: string): number {
  return Date.parse(`${localDate}T00:00:00Z`);
}

/** Whole days between two local YYYY-MM-DD dates; 0 on garbage input. */
export function daysBetween(from: string, to: string): number {
  const start = utcMidnight(from);
  const end = utcMidnight(to);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.round((end - start) / 86_400_000);
}

export function lastActiveDate(stamps: FriendshipDates): string | null {
  const dates = [stamps.adventure, stamps.session, stamps.pet].filter(
    (date): date is string => typeof date === 'string' && date !== '',
  );
  if (!dates.length) return null;
  return dates.reduce((max, date) => (date > max ? date : max));
}

// Order matters: a fully earned day outranks the milestone tease, because the
// missing heart can't be earned until tomorrow anyway.
export function selectGreeting(
  points: number,
  stamps: FriendshipDates,
  today: string,
): GreetingKind | null {
  const last = lastActiveDate(stamps);
  if (last && daysBetween(last, today) >= GREETING_BREAK_DAYS) return 'backAfterBreak';
  if (todayOpportunities(stamps, today).every((opportunity) => opportunity.done)) return 'allDone';
  if (heartsToNext(points) === 1) return 'nearMilestone';
  if (canEarn('adventure', stamps, today)) return 'adventureNotDone';
  return null;
}
