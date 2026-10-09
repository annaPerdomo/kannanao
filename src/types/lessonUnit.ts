export type LessonWeekStatus = 'draft' | 'upcoming' | 'current' | 'past';

export interface HandoutPatch {
  title?: string | null;
  note?: string | null;
  dueDate?: string | null;
  availableOn?: string | null;
  requiredAccuracy?: number | null;
  requiredMode?: string | null;
}

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
  wordCount: number;
  status: LessonWeekStatus;
  kanaSets: string[];
  handedOut: boolean;
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

export interface CreateLessonPayload {
  groupId: string;
  title: string;
  unit: { planId: string } | { title: string | null };
  kanaSets?: string[];
}

export interface CreateLessonResult {
  planId: string;
  deckId: string;
}

export interface HandOutLessonPayload {
  groupId: string;
  deckId: string;
  dueDate: string | null;
  availableOn: string | null;
  requiredAccuracy?: number | null;
  requiredMode?: string | null;
  withSentences?: boolean;
}

export interface HandOutLessonResult {
  assigned: number;
  kanaAssigned: string[];
  kanaFailed: string[];
  sentences?: 'ok' | 'failed';
}
