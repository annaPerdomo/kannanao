/**
 * Combo meter core — pure, side-effect-free so it can be exhaustively unit
 * tested without React or the DB.
 *
 * A "run" is a streak of consecutive correct answers. The count climbs by one
 * per correct answer and resets to zero on a wrong one. Small FLAT XP bonuses
 * fire the moment the count reaches an exact threshold (once per run, because
 * the count passes through each threshold value exactly once before it resets —
 * it only ever increments by one). No multipliers: XP doubles as the shop
 * currency, so every bonus here is a fixed amount that can't inflate the
 * economy. This is the single source of truth for the thresholds — never
 * duplicate these numbers elsewhere.
 */

/** Exact combo counts that award a flat XP bonus, ascending. */
export const COMBO_THRESHOLDS: ReadonlyArray<{ count: number; bonus: number }> = [
  { count: 3, bonus: 5 },
  { count: 5, bonus: 10 },
  { count: 10, bonus: 25 },
];

/** The highest threshold — past this a run earns no further bonus until reset. */
export const COMBO_MAX_THRESHOLD = COMBO_THRESHOLDS[COMBO_THRESHOLDS.length - 1].count;

export interface ComboState {
  /** Consecutive correct answers in the current run. */
  count: number;
}

export const INITIAL_COMBO: ComboState = { count: 0 };

export interface ComboStepResult {
  /** The run length after this answer (0 after a wrong answer). */
  count: number;
  /** Flat XP to award for crossing a threshold this step; 0 if none. */
  bonusAwarded: number;
}

/**
 * Advance the combo by one answer.
 *
 * The returned object is also a valid `ComboState` (it carries `count`), so a
 * caller can feed it straight back in as the next `state`. Because the count
 * only ever moves by +1 (correct) or to 0 (wrong), it lands on each threshold
 * value exactly once per run — so checking for an exact match is enough to fire
 * every bonus once and never twice.
 */
export function comboStep(state: ComboState, correct: boolean): ComboStepResult {
  if (!correct) return { count: 0, bonusAwarded: 0 };
  const count = state.count + 1;
  const hit = COMBO_THRESHOLDS.find((t) => t.count === count);
  return { count, bonusAwarded: hit ? hit.bonus : 0 };
}
