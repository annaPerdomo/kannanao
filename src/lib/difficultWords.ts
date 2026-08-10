/**
 * Turns one card's group-wide signals into the single plain-language reason the
 * Words tab shows next to it.
 *
 * The thresholds are the same ones `group_difficult_words` filters on (migration
 * 20260809020000): SQL decides WHICH cards come back, this decides what each one
 * is called. If the two ever drift, `deriveReason` returning null drops the row
 * rather than rendering a word with no explanation.
 */

/** Ease bottoms out at 1.3; at or below this the group is barely holding it. */
export const LOW_EASE = 1.6;
/** Below this many answers, a low ease is noise rather than chronic difficulty. */
export const MIN_ATTEMPTS_FOR_MISSED = 4;

export type DifficultWordReason = 'forgotten' | 'missed' | 'shaky';

/** The subset of a `group_difficult_words` row the reason depends on. */
export interface DifficultWordSignals {
  attemptCount: number;
  strugglingCount: number;
  lowEaseCount: number;
  /** Learners who lapsed on this card recently — the SQL applies the window. */
  lapseLearnerCount: number;
  avgEase: number;
}

/** First match wins, most actionable for a teacher first. */
export function deriveReason(signals: DifficultWordSignals): DifficultWordReason | null {
  if (signals.lapseLearnerCount > 0) return 'forgotten';
  if (signals.avgEase <= LOW_EASE && signals.attemptCount >= MIN_ATTEMPTS_FOR_MISSED) {
    return 'missed';
  }
  if (signals.strugglingCount > 0) return 'shaky';
  return null;
}

/**
 * How many learners the stated reason is about. Each reason counts a different
 * set, so a row never claims "3 of 8 affected" off a number measuring something
 * other than what its chip says.
 */
export function learnersAffected(
  signals: DifficultWordSignals,
  reason: DifficultWordReason,
): number {
  if (reason === 'forgotten') return signals.lapseLearnerCount;
  if (reason === 'missed') return signals.lowEaseCount;
  return signals.strugglingCount;
}
