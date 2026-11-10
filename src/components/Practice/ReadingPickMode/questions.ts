import { weekdayIndex } from '@/lib/calendarWords';
import { readingChoices } from '@/lib/readingConfusions';
import type { Flashcard } from '@/types/flashcard';

import { isReadingCard } from '../ReadingMode/eligibility';

export const MIN_PICK_CARDS = 4;

export interface PickQuestion {
  choices: string[];
  answer: string;
  /** Set when the word is a day of the week: the calendar column to box. */
  weekday: number | null;
}

export function pickQuestion(card: Flashcard, seed: number): PickQuestion | null {
  if (!isReadingCard(card)) return null;
  const word = card.word.trim();
  const reading = card.reading.trim();
  const built = readingChoices(word, reading, seed);
  if (!built) return null;
  return {
    choices: built.options.map((stem) => stem + built.suffix),
    answer: reading,
    weekday: weekdayIndex(word),
  };
}

export function eligiblePickCards(cards: Flashcard[]): Flashcard[] {
  return cards.filter((card) => pickQuestion(card, 0) !== null);
}
