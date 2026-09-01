import type { SessionMode } from '@/hooks/useProgress';

/**
 * Minimum cards a session must contain before an accuracy goal is evaluated.
 * Without a floor, a single-card session (1/1 = 100%) would satisfy any
 * accuracy goal, so the goal would carry no information for the teacher.
 *
 * A deck smaller than this can't reach the flat floor at all, so the effective
 * floor is capped at the deck's size (see {@link masteryMinCards}) — otherwise
 * an assignment on a 3-card deck could never be completed.
 */
export const MASTERY_MIN_CARDS = 5;

/**
 * The card floor for one deck: the flat minimum, or the whole deck when the
 * deck is smaller. Passing the deck size is what keeps the anti-gaming intent —
 * a 1-card session on a 20-card deck still falls short of the flat floor.
 */
export function masteryMinCards(deckCardCount?: number | null): number {
  if (deckCardCount == null || deckCardCount <= 0) return MASTERY_MIN_CARDS;
  return Math.min(MASTERY_MIN_CARDS, deckCardCount);
}

/**
 * Modes a goal can require. Only sessions carrying a deck_id can complete a deck
 * goal, and the arcade games and speech modes start deckless sessions.
 */
export const GOAL_MODES = [
  'study',
  'review',
  'match',
  'fill',
  'recall',
  'kotoba-bubble',
  'quiz',
  'listen',
  'reading',
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
  listen: 'Listen',
  reading: 'Reading',
};

export function isGoalMode(value: unknown): value is GoalMode {
  return typeof value === 'string' && (GOAL_MODES as readonly string[]).includes(value);
}

/** Accuracy choices offered in the organizer dialog (kept simple on purpose). */
export const GOAL_ACCURACY_CHOICES = [70, 80, 90] as const;

export interface MasteryCriteria {
  required_accuracy: number | null;
  required_mode: string | null;
  /** Kana curriculum key when the goal is a kana row; null for a deck goal. */
  kana_set?: string | null;
}

export interface MasterySessionStats {
  practice_mode: string | null;
  cards_studied: number;
  cards_correct: number;
  /** The row a set-scoped kana session drilled; null for every other session. */
  kana_set?: string | null;
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

// Integer math, so a boundary case like 4/5 against 80% can't be lost to float
// rounding.
function accuracyOutcome(
  requiredAccuracy: number | null,
  session: MasterySessionStats,
  minCards: number,
): MasteryResult {
  if (requiredAccuracy == null) return { completes: true, qualifyingAccuracy: null };
  if (session.cards_studied < minCards) return { completes: false, qualifyingAccuracy: null };
  const accuracy = Math.round((session.cards_correct / session.cards_studied) * 100);
  const completes = session.cards_correct * 100 >= requiredAccuracy * session.cards_studied;
  return { completes, qualifyingAccuracy: accuracy };
}

/**
 * Decide whether a finished session completes an assignment.
 *
 * Deck goal: (required_mode is null OR the session used it) AND
 * (required_accuracy is null OR the session hit it with at least
 * `masteryMinCards(deckCardCount)` cards).
 *
 * Kana goal: the session must be scoped to the assigned row — a mixed review
 * that happened to cover it carries no kana_set and never counts — plus the
 * same accuracy rule.
 */
export function evaluateMastery(
  criteria: MasteryCriteria,
  session: MasterySessionStats,
  deckCardCount?: number | null,
): MasteryResult {
  if (criteria.kana_set != null) {
    if (session.kana_set !== criteria.kana_set) {
      return { completes: false, qualifyingAccuracy: null };
    }
    return accuracyOutcome(criteria.required_accuracy, session, MASTERY_MIN_CARDS);
  }
  if (criteria.required_mode != null && session.practice_mode !== criteria.required_mode) {
    return { completes: false, qualifyingAccuracy: null };
  }
  return accuracyOutcome(criteria.required_accuracy, session, masteryMinCards(deckCardCount));
}

/**
 * One plain-words description of a goal, or null when the assignment has none.
 * Reads like "80% in Match", "80%", or "practice in Match".
 *
 * English-only — UI components must use `useGoalLabel` from
 * `@/components/Group/useGoalLabel` so the label follows the active locale.
 */
export function goalLabel(criteria: MasteryCriteria): string | null {
  const { required_accuracy } = criteria;
  const required_mode = criteria.kana_set != null ? null : criteria.required_mode;
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
