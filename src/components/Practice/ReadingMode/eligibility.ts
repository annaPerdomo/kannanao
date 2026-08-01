import { isPureKana } from '@/lib/reviewGames';
import type { Flashcard } from '@/types/flashcard';

/** Below this many eligible cards a round would be too short to be worth it. */
export const MIN_READING_CARDS = 4;

const KANJI = /[㐀-䶿一-鿿]/;

/**
 * A card can be asked in Reading mode only when the prompt actually hides the
 * answer: the word contains kanji, and the reading is kana that differs from
 * it. A kana-only card would print its own answer on screen.
 */
export function isReadingCard(card: Flashcard): boolean {
  const word = card.word?.trim() ?? '';
  const reading = card.reading?.trim() ?? '';
  return KANJI.test(word) && reading !== '' && reading !== word && isPureKana(reading);
}

export function eligibleReadingCards(cards: Flashcard[]): Flashcard[] {
  return cards.filter(isReadingCard);
}
