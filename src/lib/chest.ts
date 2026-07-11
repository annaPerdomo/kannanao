/**
 * Daily chest — pure eligibility logic, side-effect-free for unit testing.
 *
 * The chest is the payoff for clearing today's due queue: finish a review-
 * originated session, have nothing left due, and (once per LOCAL day) a chest
 * appears on the celebration screen for a flat +100 XP. It is deliberately the
 * anchor reward — free-playing a game never opens it. The date uses the same
 * local-timezone string convention as the study streak so the two can't
 * disagree near midnight.
 */

/** Flat XP awarded for opening the daily chest (stacks with the perfect bonus). */
export const CHEST_XP = 100;

/** A YYYY-MM-DD string in the user's LOCAL timezone (streak/chest convention). */
export function localDateString(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

export interface ChestEligibilityInput {
  /** last_chest_date from user_progress — a local YYYY-MM-DD string, or null. */
  lastChestDate: string | null | undefined;
  /** Today as a local YYYY-MM-DD string (streak convention). */
  today: string;
  /** Cards still due after this session ended. The chest needs an empty queue. */
  dueCount: number;
  /** True only for a session that started from the /review due-cards flow. */
  fromReview: boolean;
}

/**
 * Whether to show the chest at the end of this session. All four must hold:
 * the session came from review, the due queue is now empty, and no chest has
 * been opened yet today.
 */
export function isChestEligible({
  lastChestDate,
  today,
  dueCount,
  fromReview,
}: ChestEligibilityInput): boolean {
  if (!fromReview) return false;
  if (dueCount > 0) return false;
  if (lastChestDate === today) return false;
  return true;
}

/** Golden chest for a flawless clear, wooden otherwise — presentation only. */
export function chestVariant(perfect: boolean): 'gold' | 'wood' {
  return perfect ? 'gold' : 'wood';
}
