import type { Assignment } from '@/hooks/useAssignments';
import type { LessonUnitWeek, LessonWeekStatus } from '@/types/lessonUnit';

export interface HandoutRef {
  deckId: string | null;
  kanaSet: string | null;
  /** Deck name, or the kana row label already computed for the batch. */
  name: string;
  emoji: string | null;
  note: string | null;
  availableOn: string | null;
  dueDate: string | null;
  requiredAccuracy: number | null;
  requiredMode: string | null;
  status?: LessonWeekStatus;
}

export function handoutRefFromAssignment(a: Assignment, name: string): HandoutRef {
  return {
    deckId: a.deck_id,
    kanaSet: a.kana_set,
    name,
    emoji: a.decks?.emoji ?? null,
    note: a.note,
    availableOn: a.available_on,
    dueDate: a.due_date,
    requiredAccuracy: a.required_accuracy,
    requiredMode: a.required_mode,
  };
}

export function handoutRefFromWeek(week: LessonUnitWeek): HandoutRef {
  return {
    deckId: week.deckId,
    kanaSet: null,
    name: week.deckName,
    emoji: week.deckEmoji,
    note: week.note,
    availableOn: week.availableOn,
    dueDate: week.dueDate,
    requiredAccuracy: week.requiredAccuracy,
    requiredMode: week.requiredMode,
    status: week.status,
  };
}
