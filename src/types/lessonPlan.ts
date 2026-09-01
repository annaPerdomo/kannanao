export interface PlanCard {
  word: string;
  reading: string;
  meaning: string;
  exampleJp: string;
  exampleEn: string;
  jlptLevel: string | null;
  /** Review-step tick state; excluded cards are stripped before apply, never sent. */
  excluded?: boolean;
}

export interface PlanDeck {
  name: string;
  description: string;
  emoji: string;
  mainViewMode: 'hiragana' | 'kanji' | 'romaji';
  cards: PlanCard[];
  /** Review-step tick state; excluded decks are stripped before apply, never sent. */
  excluded?: boolean;
}

export interface LessonPlan {
  decks: PlanDeck[];
}

/** A reference file (vocab list, syllabus, textbook page) the organizer attaches for extra context. */
export interface LessonDocument {
  name: string;
  mimeType: string;
  /** Object key in the private `lesson-documents` bucket, `<organizerId>/<uuid>.<ext>`. */
  path: string;
  bytes: number;
}

/** A pool word already covered by the group's decks; shown as a display-only warm-up list. */
export interface WarmUpWord {
  word: string;
  reading: string;
  meaning: string;
  deckName: string;
}

export interface LessonPlanResponse {
  plan: LessonPlan;
  /** Known words the server filtered out of the generated plan. */
  warmUp?: WarmUpWord[];
  /** Full group pool (words only); feeds the review step's "builds on" chips. */
  knownWords?: string[];
}

export interface ApplyDeckResult {
  name: string;
  deckId?: string;
  status: 'created' | 'failed';
  cardCount?: number;
  assigned?: boolean;
  error?: string;
}
