export const WEEK_CHOICES = [1, 2, 3, 4, 5, 6, 7, 8] as const;
export const CARDS_PER_DECK_CHOICES = [5, 8, 10, 12, 15, 20] as const;

export const DEFAULT_WEEKS = 4;
export const DEFAULT_CARDS_PER_DECK = 12;
export const GOAL_MAX_LENGTH = 500;

/** Assignments land on a Sunday by default — the natural end of a study week. */
export function nextSunday(from = new Date()): string {
  const date = new Date(from);
  const daysAhead = (7 - date.getDay()) % 7 || 7;
  date.setDate(date.getDate() + daysAhead);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}
