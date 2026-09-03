/**
 * Buddy friendship hearts/level math. State lives in buddy_friendship and
 * all writes go through the award_friendship RPC. Every date here is a
 * local YYYY-MM-DD string (streak/chest convention, see localDateString).
 */

export type FriendshipSource = 'adventure' | 'session' | 'pet';

/**
 * Hearts per source, each capped at once per LOCAL day across ALL of the
 * user's buddies (the RPC enforces this, so buddy-switching can't
 * double-pay a source). Adventure is the anchor activity, hence 3.
 */
export const FRIENDSHIP_POINTS: Record<FriendshipSource, number> = {
  adventure: 3,
  session: 1,
  pet: 1,
};

export const HEARTS_PER_DAY = Object.values(FRIENDSHIP_POINTS).reduce((total, n) => total + n, 0);

/**
 * Cumulative hearts required to REACH level index+1. At the max pace of
 * 5/day the level-ups land near days 3, 8, 16, 28 — quick early wins, then
 * a real month to max.
 */
export const LEVEL_THRESHOLDS = [0, 15, 40, 80, 140];

export const MAX_FRIENDSHIP_LEVEL = 5;

export function clampPoints(points: number): number {
  return !Number.isFinite(points) || points < 0 ? 0 : points;
}

/** Friendship level (1..MAX_FRIENDSHIP_LEVEL). Negative/garbage points clamp to 1. */
export function friendshipLevel(points: number): number {
  const earned = clampPoints(points);
  let level = 1;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (earned >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
      break;
    }
  }
  return Math.min(level, MAX_FRIENDSHIP_LEVEL);
}

/**
 * Progress within the current level: `current` hearts earned into it,
 * `needed` the level's full width. Null at max level.
 */
export function friendshipProgress(points: number): { current: number; needed: number } | null {
  const level = friendshipLevel(points);
  if (level >= MAX_FRIENDSHIP_LEVEL) return null;
  const floor = LEVEL_THRESHOLDS[level - 1];
  const ceiling = LEVEL_THRESHOLDS[level];
  return { current: clampPoints(points) - floor, needed: ceiling - floor };
}

/**
 * Local YYYY-MM-DD stamps per source, already merged across the user's rows by
 * the caller; null/missing means the source never paid.
 */
export interface FriendshipDates {
  adventure?: string | null;
  session?: string | null;
  pet?: string | null;
}

export function canEarn(
  source: FriendshipSource,
  lastDates: FriendshipDates,
  today: string,
): boolean {
  return lastDates[source] !== today;
}

export interface TodayOpportunity {
  source: FriendshipSource;
  points: number;
  done: boolean;
}

export function todayOpportunities(lastDates: FriendshipDates, today: string): TodayOpportunity[] {
  const sources: FriendshipSource[] = ['adventure', 'session', 'pet'];
  return sources.map((source) => ({
    source,
    points: FRIENDSHIP_POINTS[source],
    done: !canEarn(source, lastDates, today),
  }));
}

/** 0..5, across ALL the user's buddies: the RPC caps per user, so never label this "today with {buddy}". */
export function heartsEarnedToday(lastDates: FriendshipDates, today: string): number {
  return todayOpportunities(lastDates, today)
    .filter((opportunity) => opportunity.done)
    .reduce((total, opportunity) => total + opportunity.points, 0);
}

export function reachableToday(
  heartsAway: number,
  lastDates: FriendshipDates,
  today: string,
): boolean {
  const remaining = todayOpportunities(lastDates, today)
    .filter((opportunity) => !opportunity.done)
    .reduce((total, opportunity) => total + opportunity.points, 0);
  return heartsAway <= remaining;
}

/**
 * 5+ cards: opening a deck and immediately quitting doesn't bond; any real
 * practice run does.
 */
export function isMeaningfulSession(cardsStudied: number): boolean {
  return cardsStudied >= 5;
}
