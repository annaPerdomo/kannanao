import { LESSON_DOCUMENT_MIME_TYPES } from '@/lib/lessonDocuments';
import { type JlptLevel, STYLE_NOTES_MAX } from '@/lib/lessonPrompts';
import type { LessonDocument } from '@/types/lessonPlan';

export const WEEK_CHOICES = [1, 2, 3, 4, 5, 6, 7, 8] as const;
export const CARDS_PER_DECK_CHOICES = [5, 8, 10, 12, 15, 20] as const;

export const DEFAULT_WEEKS = 4;
export const DEFAULT_CARDS_PER_DECK = 12;
export const GOAL_MAX_LENGTH = 500;

export const DOCUMENT_ACCEPTED_TYPES = LESSON_DOCUMENT_MIME_TYPES;
export const DOCUMENT_ACCEPT_ATTR = '.pdf,.txt,application/pdf,text/plain';
export const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;
/**
 * Gemini caps one generateContent request — inline files plus prompt — at 20 MB,
 * and base64 inflates a file by 4/3. 14 MB raw is ~18.7 MB encoded; raising this
 * total makes the request itself fail, whatever the transport allows.
 */
export const DOCUMENT_MAX_TOTAL_BYTES = 14 * 1024 * 1024;

/** Goal ideas shown as chips above the goal field — keys under `Materials.suggestions`. */
export const GOAL_SUGGESTION_KEYS = ['dailyLife', 'travel', 'foodCulture', 'seasons'] as const;

export const AUDIENCE_CHOICES = ['any', 'kids', 'teens', 'adults'] as const;
export type AudienceKey = (typeof AUDIENCE_CHOICES)[number];

/** Prompts are written in English regardless of UI locale, so these are too. */
const AUDIENCE_NOTES: Record<AudienceKey, string | undefined> = {
  any: undefined,
  kids: 'The learners are young children — keep topics playful and concrete (home, school, animals, food) and keep sentences short.',
  teens:
    'The learners are teenagers — school life, friends, club activities and everyday plans make good topics.',
  adults:
    'The learners are adults — work, travel, errands and polite everyday conversation make good topics.',
};

/**
 * The free-typed notes plus the audience pitch, folded into one styleNotes
 * string. The educator's own words always survive whole; the canned note is
 * appended only when it fits the server's cap entirely.
 */
export function effectiveStyleNotes(form: Pick<LessonSetForm, 'audience' | 'styleNotes'>) {
  const typed = form.styleNotes.trim().slice(0, STYLE_NOTES_MAX);
  const note = AUDIENCE_NOTES[form.audience];
  const room = STYLE_NOTES_MAX - typed.length - (typed ? 1 : 0);
  const combined = note && note.length <= room ? [typed, note].filter(Boolean).join(' ') : typed;
  return combined || undefined;
}

export interface LessonSetForm {
  goal: string;
  weeks: number;
  cardsPerDeck: number;
  level: JlptLevel;
  audience: AudienceKey;
  styleNotes: string;
  documents: LessonDocument[];
  withSentences: boolean;
}

/** A study week ends on Sunday. */
export function nextSunday(from = new Date()): string {
  const date = new Date(from);
  const daysAhead = (7 - date.getDay()) % 7 || 7;
  date.setDate(date.getDate() + daysAhead);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}
