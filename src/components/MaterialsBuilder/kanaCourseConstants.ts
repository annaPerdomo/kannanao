import type { KanaCourseScript } from '@/lib/kanaCourse';

export const ROWS_PER_WEEK_CHOICES = [2, 3, 4, 5] as const;
export const KANA_COURSE_WEEK_CHOICES = [2, 3, 4, 6, 8] as const;
export const KANA_SCRIPT_CHOICES: KanaCourseScript[] = ['hiragana', 'katakana', 'both'];

/** Mirrors the apply route's caps: one invocation writes rows x roster. */
export const KANA_COURSE_MAX_WEEKS = 16;
export const KANA_COURSE_MAX_ROWS = 24;

export const DEFAULT_ROWS_PER_WEEK = 3;
export const DEFAULT_KANA_COURSE_WEEKS = 4;
/** Days a row is due before the deck whose words need it. */
export const KANA_COURSE_LEAD_DAYS = 3;

export type KanaCourseSourceKind = 'lessons' | 'chart';

export interface KanaCourseForm {
  sourceKind: KanaCourseSourceKind;
  script: KanaCourseScript;
  fromSetId: string | null;
  rowsPerWeek: number;
  weeks: number;
  firstDueDate: string;
  accuracy: number | null;
}
