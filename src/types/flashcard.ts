export type JlptLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';

export type MainViewMode = 'hiragana' | 'kanji' | 'romaji';

export interface Flashcard {
  id: string;
  word: string;
  reading: string;
  /**
   * Word-spaced Hepburn romaji. Optional — cards created before the column
   * existed fall back to romanising `reading`, which is only readable for
   * single words. See `romajiFor()`.
   */
  romaji?: string;
  meaning: string;
  image_query: string;
  example_jp: string;
  example_en: string;
  imageUrl?: string;
  deckId: string;
  mainViewMode: MainViewMode;
  cardType: 'word' | 'phrase';
  jlptLevel?: JlptLevel;
  position: number;
}

export interface GeneratePayload {
  pendingWords: string[];
}

export interface GeneratedCard {
  word: string;
  reading: string;
  /** Word-spaced Hepburn romaji, e.g. "yoroshiku onegaishimasu". */
  romaji?: string;
  meaning: string;
  image_query: string;
  example_jp: string;
  example_en: string;
  card_type: 'word' | 'phrase';
  jlpt_level: JlptLevel | null;
}
