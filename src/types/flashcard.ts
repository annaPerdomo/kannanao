export interface Flashcard {
  id: string;
  word: string;
  reading: string;
  meaning: string;
  image_query: string;
  example_jp: string;
  example_en: string;
  imageUrl?: string;
  deckId: string;
  mainViewMode: 'hiragana' | 'kanji';
  cardType: 'word' | 'phrase';
}

export interface GeneratePayload {
  pendingWords: string[];
}

export interface GeneratedCard {
  word: string;
  reading: string;
  meaning: string;
  image_query: string;
  example_jp: string;
  example_en: string;
  card_type: 'word' | 'phrase';
}
