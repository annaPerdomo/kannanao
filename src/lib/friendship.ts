/**
 * Buddy friendship — pure hearts/level math, side-effect-free for unit
 * testing. The equipped buddy earns hearts from meaningful daily practice
 * and levels up; state lives in the buddy_friendship table and all writes
 * go through the award_friendship RPC. Every date here is a local
 * YYYY-MM-DD string (streak/chest convention, see localDateString).
 */

export type FriendshipSource = 'adventure' | 'session' | 'pet';

/**
 * Hearts per earning source, each capped at once per LOCAL day (the RPC
 * enforces the cap across ALL of the user's buddies, so switching the
 * equipped buddy mid-day can't double-pay a source). Adventure is the
 * anchor activity, so it pays 3; finishing a meaningful study session and
 * petting the buddy pay 1 each.
 */
export const FRIENDSHIP_POINTS: Record<FriendshipSource, number> = {
  adventure: 3,
  session: 1,
  pet: 1,
};

/** Most hearts one buddy can earn per day — 3+1+1 by construction. */
export const FRIENDSHIP_DAILY_MAX = 5;

/**
 * Cumulative hearts required to REACH level index+1. At the max daily pace
 * of 5 hearts that lands the level-ups at roughly day 3, 8, 16, and 28 —
 * quick early wins, then a friendship that takes a real month to max.
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
 * `needed` the level's full width. Returns null at max level (no bar to
 * fill — the UI shows a full heart instead).
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
 * Whether a source can still pay out today, given the user's stamp dates
 * (local YYYY-MM-DD strings from buddy_friendship, already merged across
 * rows by the caller). Null/missing stamps mean the source never paid.
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
 * A session only bonds with the buddy when at least 5 cards were studied —
 * enough that opening a deck and immediately quitting doesn't count, small
 * enough that any real practice run clears it.
 */
export function isMeaningfulSession(cardsStudied: number): boolean {
  return cardsStudied >= 5;
}
