import { beforeEach, describe, expect, it } from 'vitest';

import {
  eligibleReadingCards,
  isReadingCard,
  MIN_READING_CARDS,
} from '@/components/Practice/ReadingMode/eligibility';
import { loadInputMode, saveInputMode } from '@/components/Practice/ReadingMode/inputMode';
import type { Flashcard } from '@/types/flashcard';

function makeCard(overrides: Partial<Flashcard> = {}): Flashcard {
  return {
    id: 'c1',
    deckId: 'deck-1',
    word: '猫',
    reading: 'ねこ',
    meaning: 'cat',
    image_query: '',
    example_jp: '猫が好きです',
    example_en: 'I like cats',
    mainViewMode: 'hiragana',
    cardType: 'word',
    position: 0,
    ...overrides,
  };
}

describe('isReadingCard', () => {
  it('accepts a kanji word with a kana reading', () => {
    expect(isReadingCard(makeCard())).toBe(true);
  });

  it('accepts a mixed kanji/okurigana word', () => {
    expect(isReadingCard(makeCard({ word: '食べる', reading: 'たべる' }))).toBe(true);
  });

  it('rejects a kana-only word — the prompt would be the answer', () => {
    expect(isReadingCard(makeCard({ word: 'ねこ', reading: 'ねこ' }))).toBe(false);
    expect(isReadingCard(makeCard({ word: 'ラーメン', reading: 'ラーメン' }))).toBe(false);
  });

  it('rejects a card with no reading', () => {
    expect(isReadingCard(makeCard({ reading: '' }))).toBe(false);
    expect(isReadingCard(makeCard({ reading: '   ' }))).toBe(false);
  });

  it('rejects a reading that repeats the kanji word', () => {
    expect(isReadingCard(makeCard({ word: '猫', reading: '猫' }))).toBe(false);
  });

  it('rejects a reading that is not pure kana — its tiles would leak kanji', () => {
    expect(isReadingCard(makeCard({ word: '子猫', reading: 'こ猫' }))).toBe(false);
  });
});

describe('eligibleReadingCards', () => {
  it('keeps only the kanji-bearing cards', () => {
    const cards = [
      makeCard({ id: 'a', word: '猫', reading: 'ねこ' }),
      makeCard({ id: 'b', word: 'ねこ', reading: 'ねこ' }),
      makeCard({ id: 'c', word: '山', reading: 'やま' }),
    ];
    expect(eligibleReadingCards(cards).map((c) => c.id)).toEqual(['a', 'c']);
  });

  it('returns an empty list for a kana-only deck', () => {
    const cards = [makeCard({ word: 'ねこ', reading: 'ねこ' })];
    expect(eligibleReadingCards(cards)).toEqual([]);
  });

  it('needs a floor of cards before a round is worth starting', () => {
    expect(MIN_READING_CARDS).toBeGreaterThan(1);
  });
});

describe('reading input preference', () => {
  beforeEach(() => localStorage.clear());

  it('defaults to tiles — no keyboard needed', () => {
    expect(loadInputMode()).toBe('tiles');
  });

  it('round-trips the typed choice', () => {
    saveInputMode('typed');
    expect(loadInputMode()).toBe('typed');
  });

  it('falls back to tiles for an unrecognised stored value', () => {
    saveInputMode('typed');
    saveInputMode('tiles');
    expect(loadInputMode()).toBe('tiles');
  });
});
