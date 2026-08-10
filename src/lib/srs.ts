// SM-2-lite spaced-repetition scheduler — the readable, unit-tested reference
// for the curve. The SAME curve is applied for real inside the `srs_next` SQL
// function (migration 20260711000000_srs_scheduler.sql), where scheduling is
// atomic; keep the two in sync — the constants (0→1→3, ease ±, floors/caps)
// live in exactly one place per file so they can't silently drift.
//
// Curve: wrong → interval 0 (re-shown in ~10 min), ease −0.2 floored at 1.3.
// correct → interval steps 0→1→3 days, then interval×ease; ease +0.05 capped
// at 2.8. Interval is capped at 60 days.

export const MIN_EASE = 1.3;
export const MAX_EASE = 2.8;
export const MAX_INTERVAL_DAYS = 60;
/** A missed card comes back this soon — same session, minutes later. */
export const WRONG_REVIEW_DELAY_MIN = 10;
/**
 * A card held this long counts as learned, so missing it is forgetting rather
 * than still learning. Lapses are actually stamped by `increment_card_progress`
 * (migration 20260809020000) — changing this means editing that SQL literal too.
 */
export const LAPSE_INTERVAL_DAYS = 7;

const DAY_MS = 86_400_000;

export interface ScheduleInput {
  correct: boolean;
  intervalDays: number;
  ease: number;
}

export interface ScheduleResult {
  intervalDays: number;
  ease: number;
  nextReviewAt: Date;
}

/** Given the current schedule and one graded answer, return the next schedule. */
export function nextSchedule(
  { correct, intervalDays, ease }: ScheduleInput,
  now: Date = new Date(),
): ScheduleResult {
  if (!correct) {
    return {
      intervalDays: 0,
      ease: Math.max(MIN_EASE, ease - 0.2),
      nextReviewAt: new Date(now.getTime() + WRONG_REVIEW_DELAY_MIN * 60_000),
    };
  }
  const grown = intervalDays < 1 ? 1 : intervalDays < 3 ? 3 : intervalDays * ease;
  const nextInterval = Math.min(MAX_INTERVAL_DAYS, grown);
  return {
    intervalDays: nextInterval,
    ease: Math.min(MAX_EASE, ease + 0.05),
    nextReviewAt: new Date(now.getTime() + nextInterval * DAY_MS),
  };
}
