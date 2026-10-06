export type LessonWeekStatus = 'upcoming' | 'current' | 'past';

export interface LessonUnitWeek {
  deckId: string;
  deckName: string;
  deckEmoji: string | null;
  /** 1-based display number; null for handouts outside any unit. */
  week: number | null;
  title: string | null;
  note: string | null;
  dueDate: string | null;
  availableOn: string | null;
  requiredAccuracy: number | null;
  requiredMode: string | null;
  learnerCount: number;
  finishedCount: number;
  status: LessonWeekStatus;
}

export interface LessonUnit {
  id: string;
  title: string | null;
  level: string | null;
  createdAt: string;
  weeks: LessonUnitWeek[];
}

export interface LessonLibrary {
  units: LessonUnit[];
  /** Deck handouts in this group that belong to no unit (single decks, Quizlet imports). */
  loose: LessonUnitWeek[];
}
