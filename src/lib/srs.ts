// SM-2-lite scheduler mirroring the `srs_next` SQL function; srsParity.test.ts
// checks it against the live DB — regenerate with `pnpm srs:vectors`.
// Same-sitting answers never change ease, so repeat misses in one retry
// loop don't double-punish.

export const MIN_EASE = 1.3;
export const MAX_EASE = 2.8;
/** A card with no progress row starts here — `increment_card_progress`'s default. */
export const START_EASE = 2.5;
export const MAX_INTERVAL_DAYS = 60;
/** A missed card comes back this soon — same session, minutes later. */
export const WRONG_REVIEW_DELAY_MIN = 10;
/**
 * A card held this long counts as learned, so missing it is forgetting rather
 * than still learning. Lapses are actually stamped by `increment_card_progress`
 * (migration 20260809020000) — changing this means editing that SQL literal too.
 */
export const LAPSE_INTERVAL_DAYS = 7;
/** 12 hours — the server has no learner-local day to compare against. */
export const SAME_SITTING_DAYS = 0.5;

const DAY_MS = 86_400_000;

export interface ScheduleInput {
  correct: boolean;
  intervalDays: number;
  ease: number;
  lastReviewedAt?: Date | null;
}

export interface ScheduleResult {
  intervalDays: number;
  ease: number;
  nextReviewAt: Date;
}

function elapsedDays(lastReviewedAt: Date | null | undefined, now: Date): number | null {
  if (!lastReviewedAt) return null;
  return (now.getTime() - lastReviewedAt.getTime()) / DAY_MS;
}

/** Given the current schedule and one graded answer, return the next schedule. */
export function nextSchedule(
  { correct, intervalDays, ease, lastReviewedAt }: ScheduleInput,
  now: Date = new Date(),
): ScheduleResult {
  const elapsed = elapsedDays(lastReviewedAt, now);
  const sameSitting = elapsed !== null && elapsed < SAME_SITTING_DAYS;

  if (!correct) {
    const alreadyMissedThisSitting = intervalDays <= 1 && sameSitting;
    return {
      intervalDays: 0,
      ease: alreadyMissedThisSitting ? ease : Math.max(MIN_EASE, ease - 0.2),
      nextReviewAt: new Date(now.getTime() + WRONG_REVIEW_DELAY_MIN * 60_000),
    };
  }

  const onTime = elapsed === null || elapsed <= intervalDays;
  let nextInterval: number;
  if (intervalDays < 1) {
    nextInterval = 1;
  } else if (sameSitting) {
    nextInterval = intervalDays;
  } else if (intervalDays < 3 && onTime) {
    nextInterval = 3;
  } else if (
    intervalDays >= 3 &&
    elapsed !== null &&
    elapsed >= SAME_SITTING_DAYS &&
    elapsed < intervalDays
  ) {
    nextInterval = Math.min(MAX_INTERVAL_DAYS, Math.max(intervalDays, elapsed * ease));
  } else {
    const base = onTime ? intervalDays : intervalDays + (elapsed! - intervalDays) / 2;
    nextInterval = Math.min(MAX_INTERVAL_DAYS, Math.max(3, base * ease));
  }

  return {
    intervalDays: nextInterval,
    ease: sameSitting ? ease : Math.min(MAX_EASE, ease + 0.05),
    nextReviewAt: new Date(now.getTime() + nextInterval * DAY_MS),
  };
}
