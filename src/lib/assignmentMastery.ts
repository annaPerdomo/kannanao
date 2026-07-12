import type { SessionMode } from '@/hooks/useProgress';

/**
 * Minimum cards a session must contain before an accuracy goal is evaluated.
 * Without a floor, a single-card session (1/1 = 100%) would satisfy any
 * accuracy goal, so the goal would carry no information for the teacher.
 */
export const MASTERY_MIN_CARDS = 5;

/**
 * Modes a goal can require. Only modes whose sessions carry a deck_id can ever
 * complete an assignment (the arcade games and speech modes start sessions
 * with a null deck), so only these are offered/accepted as goal modes.
 */
export const GOAL_MODES = [
  'study',
  'review',
  'match',
  'fill',
  'recall',
  'kotoba-bubble',
  'quiz',
] as const satisfies readonly SessionMode[];

export type GoalMode = (typeof GOAL_MODES)[number];

export const GOAL_MODE_LABELS: Record<GoalMode, string> = {
  study: 'Study',
  review: 'Review',
  match: 'Match',
  fill: 'Fill',
  recall: 'Recall',
  'kotoba-bubble': 'Sentence Builder',
  quiz: 'Quiz',
};

export function isGoalMode(value: unknown): value is GoalMode {
  return typeof value === 'string' && (GOAL_MODES as readonly string[]).includes(value);
}

/** Accuracy choices offered in the organizer dialog (kept simple on purpose). */
export const GOAL_ACCURACY_CHOICES = [70, 80, 90] as const;

export interface MasteryCriteria {
  required_accuracy: number | null;
  required_mode: string | null;
}

export interface MasterySessionStats {
  practice_mode: string | null;
  cards_studied: number;
  cards_correct: number;
}

export interface MasteryResult {
  /** Whether this session satisfies the assignment's criteria. */
  completes: boolean;
  /**
   * The session's accuracy (0-100, rounded) when the session qualifies toward
   * an accuracy goal (mode matches + card floor met); null otherwise. Callers
   * use this to keep the best-so-far progress_accuracy for student feedback.
   */
  qualifyingAccuracy: number | null;
}

/**
 * Decide whether a finished session completes an assignment.
 *
 * Rules: (required_mode is null OR the session used it) AND
 * (required_accuracy is null OR the session hit it with at least
 * MASTERY_MIN_CARDS cards). The accuracy comparison is done in integer math
 * (correct * 100 >= required * studied) so boundary cases like 4/5 vs 80%
 * can't be lost to float rounding.
 */
export function evaluateMastery(
  criteria: MasteryCriteria,
  session: MasterySessionStats,
): MasteryResult {
  if (criteria.required_mode != null && session.practice_mode !== criteria.required_mode) {
    return { completes: false, qualifyingAccuracy: null };
  }
  if (criteria.required_accuracy == null) {
    return { completes: true, qualifyingAccuracy: null };
  }
  if (session.cards_studied < MASTERY_MIN_CARDS) {
    return { completes: false, qualifyingAccuracy: null };
  }
  const accuracy = Math.round((session.cards_correct / session.cards_studied) * 100);
  const completes =
    session.cards_correct * 100 >= criteria.required_accuracy * session.cards_studied;
  return { completes, qualifyingAccuracy: accuracy };
}

/**
 * One plain-words description of a goal, or null when the assignment has none.
 * Reads like "80% in Match", "80%", or "practice in Match".
 */
export function goalLabel(criteria: MasteryCriteria): string | null {
  const { required_accuracy, required_mode } = criteria;
  if (required_accuracy == null && required_mode == null) return null;
  const modeName = required_mode
    ? isGoalMode(required_mode)
      ? GOAL_MODE_LABELS[required_mode]
      : required_mode
    : null;
  if (required_accuracy != null && modeName) return `${required_accuracy}% in ${modeName}`;
  if (required_accuracy != null) return `${required_accuracy}%`;
  return `practice in ${modeName}`;
}
