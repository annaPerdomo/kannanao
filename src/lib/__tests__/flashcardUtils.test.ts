import { describe, expect, it } from 'vitest';

import { cardXp, getFlashcardDisplayText } from '@/lib/flashcardUtils';
import type { Flashcard } from '@/types/flashcard';

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeCard(overrides: Partial<Flashcard> = {}): Flashcard {
  return {
    id: 'c1',
    deckId: 'd1',
    word: '猫',
    reading: 'ねこ',
    meaning: 'cat',
    image_query: 'cat',
    example_jp: '猫が好きです',
    example_en: 'I like cats',
    mainViewMode: 'hiragana',
    cardType: 'word',
    position: 0,
    ...overrides,
  };
}

// ─── cardXp ───────────────────────────────────────────────────────────────────

describe('cardXp', () => {
  it('should return 40 for N5', () => {
    expect(cardXp('N5')).toBe(40);
  });

  it('should return 60 for N4', () => {
    expect(cardXp('N4')).toBe(60);
  });

  it('should return 80 for N3', () => {
    expect(cardXp('N3')).toBe(80);
  });

  it('should return 100 for N2', () => {
    expect(cardXp('N2')).toBe(100);
  });

  it('should return 120 for N1', () => {
    expect(cardXp('N1')).toBe(120);
  });

  it('should return 40 (default) for undefined', () => {
    expect(cardXp(undefined)).toBe(40);
  });

  it('should return 40 (default) for null', () => {
    expect(cardXp(null)).toBe(40);
  });
});

// ─── getFlashcardDisplayText ───────────────────────────────────────────────────

describe('getFlashcardDisplayText', () => {
  it('should return reading as titleText in hiragana mode when reading exists', () => {
    const card = makeCard({ mainViewMode: 'hiragana', word: '猫', reading: 'ねこ' });
    const { titleText, subtitleText } = getFlashcardDisplayText(card);
    expect(titleText).toBe('ねこ');
    expect(subtitleText).toBeUndefined();
  });

  it('should return word as titleText in kanji mode', () => {
    const card = makeCard({ mainViewMode: 'kanji', word: '猫', reading: 'ねこ' });
    const { titleText, subtitleText: _subtitleText } = getFlashcardDisplayText(card);
    expect(titleText).toBe('猫');
  });

  it('should return reading as subtitle in kanji mode when reading exists', () => {
    const card = makeCard({ mainViewMode: 'kanji', word: '猫', reading: 'ねこ' });
    const { subtitleText } = getFlashcardDisplayText(card);
    expect(subtitleText).toBe('ねこ');
  });

  it('should return undefined subtitle in kanji mode when reading is empty', () => {
    const card = makeCard({ mainViewMode: 'kanji', word: 'hello', reading: '' });
    const { subtitleText } = getFlashcardDisplayText(card);
    expect(subtitleText).toBeUndefined();
  });

  it('should fall back to word when reading is empty in hiragana mode', () => {
    const card = makeCard({ mainViewMode: 'hiragana', word: 'hello', reading: '' });
    const { titleText } = getFlashcardDisplayText(card);
    expect(titleText).toBe('hello');
  });

  it('should fall back to word when reading is only whitespace', () => {
    const card = makeCard({ mainViewMode: 'hiragana', word: 'hello', reading: '   ' });
    const { titleText } = getFlashcardDisplayText(card);
    expect(titleText).toBe('hello');
  });
});
