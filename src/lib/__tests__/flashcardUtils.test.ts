import { describe, expect, it } from 'vitest';

import {
  buildMeaningChoices,
  cardXp,
  getFlashcardDisplayText,
  romajiFor,
  titleFontSize,
} from '@/lib/flashcardUtils';
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

// ─── romajiFor ────────────────────────────────────────────────────────────────

describe('romajiFor', () => {
  it('prefers the stored, word-spaced romaji', () => {
    const card = makeCard({
      reading: 'はじめまして、よろしくおねがいします',
      romaji: 'hajimemashite, yoroshiku onegaishimasu',
    });
    expect(romajiFor(card)).toBe('hajimemashite, yoroshiku onegaishimasu');
  });

  it('romanises the reading when no romaji is stored', () => {
    expect(romajiFor(makeCard({ reading: 'ねこ', romaji: '' }))).toBe('neko');
  });

  it('gives punctuation a space when falling back on a legacy card', () => {
    // Not real word boundaries — kana cannot give those back — but at least the
    // run-on does not swallow the comma.
    expect(romajiFor(makeCard({ reading: 'はい、そうです', romaji: undefined }))).toBe(
      'hai, soudesu',
    );
  });

  it('ignores whitespace-only stored romaji', () => {
    expect(romajiFor(makeCard({ reading: 'ねこ', romaji: '   ' }))).toBe('neko');
  });
});

describe('getFlashcardDisplayText in romaji mode', () => {
  it('uses the stored romaji as the title', () => {
    const card = makeCard({
      mainViewMode: 'romaji',
      word: 'はじめまして、よろしくお願いします',
      reading: 'はじめまして、よろしくおねがいします',
      romaji: 'hajimemashite, yoroshiku onegaishimasu',
    });
    const { titleText, subtitleText } = getFlashcardDisplayText(card);
    expect(titleText).toBe('hajimemashite, yoroshiku onegaishimasu');
    expect(subtitleText).toBe('はじめまして、よろしくお願いします');
  });

  it('still shows romaji when the card has romaji but no kana reading', () => {
    const card = makeCard({ mainViewMode: 'romaji', word: '会計', reading: '', romaji: 'kaikei' });
    expect(getFlashcardDisplayText(card).titleText).toBe('kaikei');
  });
});

// ─── titleFontSize ─────────────────────────────────────────────────────────────

describe('titleFontSize', () => {
  it('should use the base size for short words', () => {
    expect(titleFontSize('ねこ', 3, 1.3)).toBe('3rem');
  });

  it('should shrink for medium-length words', () => {
    expect(titleFontSize('がんばって', 3, 1.3)).toBe('2.4rem');
  });

  it('should shrink further for long words', () => {
    expect(titleFontSize('にゅうきょしゃ', 3, 1.3)).toBe('1.95rem');
  });

  it('should never go below the minimum size', () => {
    expect(titleFontSize('a'.repeat(30), 3, 1.3)).toBe('1.65rem');
    expect(titleFontSize('a'.repeat(30), 3, 2)).toBe('2rem');
  });
});

// ─── buildMeaningChoices ───────────────────────────────────────────────────────

describe('buildMeaningChoices', () => {
  it('includes the correct meaning and up to three distractors', () => {
    const correct = makeCard({ id: 'c1', meaning: 'cat' });
    const pool = [
      correct,
      makeCard({ id: 'c2', meaning: 'dog' }),
      makeCard({ id: 'c3', meaning: 'bird' }),
      makeCard({ id: 'c4', meaning: 'fish' }),
      makeCard({ id: 'c5', meaning: 'horse' }),
    ];
    const choices = buildMeaningChoices(correct, pool);
    expect(choices).toHaveLength(4);
    expect(choices).toContain('cat');
  });

  it('never emits a distractor equal to the correct meaning (synonym cards)', () => {
    const correct = makeCard({ id: 'c1', meaning: 'cold' });
    const pool = [
      correct,
      makeCard({ id: 'c2', meaning: 'cold' }), // 寒い vs 冷たい — same gloss
      makeCard({ id: 'c3', meaning: 'hot' }),
    ];
    for (let i = 0; i < 20; i++) {
      const choices = buildMeaningChoices(correct, pool);
      expect(choices.filter((c) => c === 'cold')).toHaveLength(1);
    }
  });

  it('dedupes identical meanings among the distractors themselves', () => {
    const correct = makeCard({ id: 'c1', meaning: 'cat' });
    const pool = [
      correct,
      makeCard({ id: 'c2', meaning: 'dog' }),
      makeCard({ id: 'c3', meaning: 'dog' }),
      makeCard({ id: 'c4', meaning: 'dog' }),
    ];
    for (let i = 0; i < 20; i++) {
      const choices = buildMeaningChoices(correct, pool);
      expect(new Set(choices).size).toBe(choices.length);
    }
  });

  it('skips cards with empty meanings', () => {
    const correct = makeCard({ id: 'c1', meaning: 'cat' });
    const pool = [
      correct,
      makeCard({ id: 'c2', meaning: '  ' }),
      makeCard({ id: 'c3', meaning: 'dog' }),
    ];
    const choices = buildMeaningChoices(correct, pool);
    expect(choices).toEqual(expect.arrayContaining(['cat', 'dog']));
    expect(choices).toHaveLength(2);
  });
});
