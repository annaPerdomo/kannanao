export interface PlanCard {
  word: string;
  reading: string;
  meaning: string;
  exampleJp: string;
  exampleEn: string;
  jlptLevel: string | null;
  /** Review-step tick state; excluded cards are stripped before apply, never sent. */
  excluded?: boolean;
  /** English search phrase for Unsplash, generated only when images were requested. */
  imageQuery?: string | null;
  /** Filled in client-side after imageQuery is looked up; absent until then. */
  imageUrl?: string | null;
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
  /** When the card was added to the group; null for a word introduced earlier in this same unsaved plan. */
  addedAt: string | null;
}

export interface LessonPlanResponse {
  plan: LessonPlan;
  /** Known words the server filtered out of the generated plan. */
  warmUp?: WarmUpWord[];
  /** Full group pool; feeds the review step's "builds on" chips. */
  knownWords?: WarmUpWord[];
}

export interface ApplyDeckResult {
  name: string;
  deckId?: string;
  status: 'created' | 'failed';
  cardCount?: number;
  assigned?: boolean;
  error?: string;
}
