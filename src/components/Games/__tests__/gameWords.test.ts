import { describe, expect, it } from 'vitest';

import type { Flashcard } from '@/types/flashcard';

import { KATAKANA_WORDS, VOCAB_WORDS } from '../data';
import { cardsToMatchWords, orderDueFirst, pickKanaWords, pickMatchWords } from '../gameWords';

function card(overrides: Partial<Flashcard>): Flashcard {
  return {
    id: 'c1',
    word: '飛行機',
    reading: 'ひこうき',
    meaning: 'airplane',
    image_query: '',
    example_jp: '',
    example_en: '',
    deckId: 'd1',
    mainViewMode: 'hiragana',
    cardType: 'word',
    position: 0,
    ...overrides,
  };
}

describe('cardsToMatchWords', () => {
  it('keeps card order and carries the cardId for the SRS write', () => {
    const a = card({ id: 'a', word: 'いぬ', reading: 'いぬ', meaning: 'dog', jlptLevel: 'N5' });
    const b = card({ id: 'b', word: 'ねこ', reading: 'ねこ', meaning: 'cat' });
    const words = cardsToMatchWords([a, b]);
    expect(words.map((w) => w.cardId)).toEqual(['a', 'b']);
    expect(words[0]).toMatchObject({ english: 'dog', jlpt: 'N5' });
  });

  it('drops cards missing a display word or meaning, and dedupes by display text', () => {
    const good = card({ id: 'a', word: 'いぬ', reading: 'いぬ', meaning: 'dog' });
    const noMeaning = card({ id: 'b', word: 'ねこ', reading: 'ねこ', meaning: '' });
    const dup = card({ id: 'c', word: 'いぬ', reading: 'いぬ', meaning: 'doggo' });
    const words = cardsToMatchWords([good, noMeaning, dup]);
    expect(words.map((w) => w.cardId)).toEqual(['a']);
  });

  it('is empty for no cards', () => {
    expect(cardsToMatchWords([])).toEqual([]);
  });
});

describe('orderDueFirst', () => {
  it('leads with due cards (in order) then tops up from the rest', () => {
    const a = card({ id: 'a' });
    const b = card({ id: 'b' });
    const c = card({ id: 'c' });
    const ordered = orderDueFirst([b, a], [a, b, c]);
    // due cards keep their given order at the front
    expect(ordered.slice(0, 2).map((x) => x.id)).toEqual(['b', 'a']);
    // the remaining card is topped up after them
    expect(ordered.map((x) => x.id).sort()).toEqual(['a', 'b', 'c']);
  });

  it('never duplicates a due card that also appears in allCards', () => {
    const a = card({ id: 'a' });
    const ordered = orderDueFirst([a], [a]);
    expect(ordered.map((x) => x.id)).toEqual(['a']);
  });

  it('works with no due cards (pure free play)', () => {
    const a = card({ id: 'a' });
    const b = card({ id: 'b' });
    expect(
      orderDueFirst([], [a, b])
        .map((x) => x.id)
        .sort(),
    ).toEqual(['a', 'b']);
  });
});

describe('pickMatchWords', () => {
  it('maps cards to match pairs using their display text and meaning', () => {
    const words = pickMatchWords(
      [],
      [
        card({ id: 'a', word: '飛行機', reading: 'ひこうき', meaning: 'airplane' }),
        card({ id: 'b', word: '猫', reading: 'ねこ', meaning: 'cat', jlptLevel: 'N5' }),
      ],
    );
    expect(words).toHaveLength(2);
    const cat = words.find((w) => w.english === 'cat')!;
    expect(cat.jp).toBe('ねこ');
    expect(cat.jlpt).toBe('N5');
    expect(cat.cardId).toBe('b');
  });

  it('puts due cards first so they survive the session cap', () => {
    const due = card({ id: 'due', word: '猫', reading: 'ねこ', meaning: 'cat' });
    const many = Array.from({ length: 60 }, (_, i) =>
      card({ id: `c${i}`, word: `word${i}`, reading: `よみ${i}`, meaning: `meaning ${i}` }),
    );
    const words = pickMatchWords([due], [due, ...many], 30);
    expect(words).toHaveLength(30);
    expect(words[0].cardId).toBe('due');
  });

  it('dedupes cards with the same display text and skips empty meanings', () => {
    const words = pickMatchWords(
      [],
      [
        card({ id: 'a', meaning: 'airplane' }),
        card({ id: 'dup', meaning: 'plane' }), // same reading → deduped
        card({ id: 'b', word: '犬', reading: 'いぬ', meaning: 'dog' }),
        card({ id: 'c', word: '猫', reading: 'ねこ', meaning: '  ' }), // blank meaning → skipped
      ],
    );
    expect(words).toHaveLength(2);
    expect(words.map((w) => w.jp).sort()).toEqual(['いぬ', 'ひこうき']);
  });

  it('falls back to starter vocabulary (no cardId) when there are no usable cards', () => {
    const words = pickMatchWords([], []);
    expect(words.length).toBeGreaterThan(0);
    expect(words.length).toBeLessThanOrEqual(30);
    expect(VOCAB_WORDS.map((w) => w.jp)).toContain(words[0].jp);
    expect(words.every((w) => w.cardId === undefined)).toBe(true);
  });

  it('caps the session size', () => {
    const many = Array.from({ length: 100 }, (_, i) =>
      card({ id: `c${i}`, word: `word${i}`, reading: `よみ${i}`, meaning: `meaning ${i}` }),
    );
    expect(pickMatchWords([], many).length).toBeLessThanOrEqual(30);
  });
});

describe('pickKanaWords', () => {
  it('uses the kana reading as the build target and carries the card id', () => {
    const words = pickKanaWords([], [card({})]);
    expect(words).toHaveLength(1);
    expect(words[0].target).toBe('ひこうき');
    expect(words[0].hint).toBe('飛行機');
    expect(words[0].english).toBe('airplane');
    expect(words[0].cardId).toBe('c1');
  });

  it('leads with the due card', () => {
    const due = card({ id: 'due', word: 'ねこ', reading: 'ねこ', meaning: 'cat' });
    const others = Array.from({ length: 20 }, (_, i) =>
      card({ id: `k${i}`, word: `かな${i}`, reading: `かな${i}`, meaning: `m${i}` }),
    );
    const words = pickKanaWords([due], [due, ...others], 15);
    expect(words[0].cardId).toBe('due');
  });

  it('skips cards without a pure-kana target or with extreme lengths', () => {
    const words = pickKanaWords(
      [],
      [
        card({ id: 'a', word: '漢字', reading: '' }), // no kana form
        card({ id: 'b', word: 'ん', reading: 'ん' }), // too short
        card({ id: 'c', reading: 'あいうえおかきくけこ' }), // too long
      ],
    );
    // falls back to the starter set because no card qualified
    expect(words.length).toBeGreaterThan(0);
    expect(KATAKANA_WORDS.map((w) => w.english)).toContain(words[0].english);
    expect(words.every((w) => w.cardId === undefined)).toBe(true);
  });

  it('accepts a kana-only word when reading is missing', () => {
    const words = pickKanaWords([], [card({ word: 'ラーメン', reading: '', meaning: 'ramen' })]);
    expect(words).toHaveLength(1);
    expect(words[0].target).toBe('ラーメン');
    expect(words[0].hint).toBeUndefined();
  });
});
