export interface PlanCard {
  word: string;
  reading: string;
  meaning: string;
  exampleJp: string;
  exampleEn: string;
  jlptLevel: string | null;
}

export interface PlanDeck {
  name: string;
  description: string;
  emoji: string;
  mainViewMode: 'hiragana' | 'kanji' | 'romaji';
  cards: PlanCard[];
}

export interface LessonPlan {
  decks: PlanDeck[];
}

/** Words the learner already owns, sent alongside a plan so the UI can show reuse. */
export interface PlanKnownWord {
  word: string;
  reading: string;
}

export interface LessonPlanResponse {
  plan: LessonPlan;
  knownWords: PlanKnownWord[];
}

export interface ApplyDeckResult {
  name: string;
  deckId?: string;
  status: 'created' | 'failed';
  cardCount?: number;
  assigned?: boolean;
  error?: string;
}
