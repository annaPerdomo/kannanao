import type { JlptLevel } from '@/lib/lessonPrompts';
import type { LessonDocument } from '@/types/lessonPlan';

export const WEEK_CHOICES = [1, 2, 3, 4, 5, 6, 7, 8] as const;
export const CARDS_PER_DECK_CHOICES = [5, 8, 10, 12, 15, 20] as const;

export const DEFAULT_WEEKS = 4;
export const DEFAULT_CARDS_PER_DECK = 12;
export const GOAL_MAX_LENGTH = 500;

export const DOCUMENT_ACCEPTED_TYPES = ['application/pdf', 'text/plain'] as const;
export const DOCUMENT_ACCEPT_ATTR = '.pdf,.txt,application/pdf,text/plain';
export const DOCUMENT_MAX_BYTES = 8 * 1024 * 1024;
/** No cap on how many files an organizer can attach — only on their combined size. */
export const DOCUMENT_MAX_TOTAL_BYTES = 20 * 1024 * 1024;

/** Goal ideas shown as chips above the goal field — keys under `Materials.suggestions`. */
export const GOAL_SUGGESTION_KEYS = ['dailyLife', 'travel', 'foodCulture', 'seasons'] as const;

export interface LessonSetForm {
  goal: string;
  weeks: number;
  cardsPerDeck: number;
  level: JlptLevel;
  styleNotes: string;
  documents: LessonDocument[];
  withSentences: boolean;
}

/** Default first due date — a study week ends on Sunday. */
export function nextSunday(from = new Date()): string {
  const date = new Date(from);
  const daysAhead = (7 - date.getDay()) % 7 || 7;
  date.setDate(date.getDate() + daysAhead);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}
