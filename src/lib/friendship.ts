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

/**
 * Cumulative hearts required to REACH level index+1. At the max pace of
 * 5/day the level-ups land near days 3, 8, 16, 28 — quick early wins, then
 * a real month to max.
 */
export const LEVEL_THRESHOLDS = [0, 15, 40, 80, 140];

export const MAX_FRIENDSHIP_LEVEL = 5;

/** Friendship level (1..MAX_FRIENDSHIP_LEVEL). Negative/garbage points clamp to 1. */
export function friendshipLevel(points: number): number {
  if (!Number.isFinite(points) || points < 0) return 1;
  let level = 1;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (points >= LEVEL_THRESHOLDS[i]) {
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
  const safePoints = !Number.isFinite(points) || points < 0 ? 0 : points;
  return { current: safePoints - floor, needed: ceiling - floor };
}

/**
 * Whether a source can still pay out today. lastDates are local YYYY-MM-DD
 * stamps already merged across the user's rows by the caller; null/missing
 * means the source never paid.
 */
export function canEarn(
  source: FriendshipSource,
  lastDates: {
    adventure?: string | null;
    session?: string | null;
    pet?: string | null;
  },
  today: string,
): boolean {
  return lastDates[source] !== today;
}

/**
 * 5+ cards: opening a deck and immediately quitting doesn't bond; any real
 * practice run does.
 */
export function isMeaningfulSession(cardsStudied: number): boolean {
  return cardsStudied >= 5;
}
