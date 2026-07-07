import { describe, expect, it } from 'vitest';

import type { Flashcard } from '@/types/flashcard';

import { KATAKANA_WORDS, VOCAB_WORDS } from '../data';
import { pickKanaWords, pickMatchWords } from '../gameWords';

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

describe('pickMatchWords', () => {
  it('maps cards to match pairs using their display text and meaning', () => {
    const words = pickMatchWords([
      card({ id: 'a', word: '飛行機', reading: 'ひこうき', meaning: 'airplane' }),
      card({ id: 'b', word: '猫', reading: 'ねこ', meaning: 'cat', jlptLevel: 'N5' }),
    ]);
    expect(words).toHaveLength(2);
    const cat = words.find((w) => w.english === 'cat')!;
    expect(cat.jp).toBe('ねこ');
    expect(cat.jlpt).toBe('N5');
  });

  it('dedupes cards with the same display text and skips empty meanings', () => {
    const words = pickMatchWords([
      card({ id: 'a', meaning: 'airplane' }),
      card({ id: 'dup', meaning: 'plane' }), // same reading → deduped
      card({ id: 'b', word: '犬', reading: 'いぬ', meaning: 'dog' }),
      card({ id: 'c', word: '猫', reading: 'ねこ', meaning: '  ' }), // blank meaning → skipped
    ]);
    expect(words).toHaveLength(2);
    expect(words.map((w) => w.jp).sort()).toEqual(['いぬ', 'ひこうき']);
  });

  it('falls back to the starter vocabulary when there are no usable cards', () => {
    const words = pickMatchWords([]);
    expect(words.length).toBeGreaterThan(0);
    expect(words.length).toBeLessThanOrEqual(30);
    expect(VOCAB_WORDS.map((w) => w.jp)).toContain(words[0].jp);
  });

  it('caps the session size', () => {
    const many = Array.from({ length: 100 }, (_, i) =>
      card({ id: `c${i}`, word: `word${i}`, reading: `よみ${i}`, meaning: `meaning ${i}` }),
    );
    expect(pickMatchWords(many).length).toBeLessThanOrEqual(30);
  });
});

describe('pickKanaWords', () => {
  it('uses the kana reading as the build target and the kanji word as hint', () => {
    const words = pickKanaWords([card({})]);
    expect(words).toHaveLength(1);
    expect(words[0].target).toBe('ひこうき');
    expect(words[0].hint).toBe('飛行機');
    expect(words[0].english).toBe('airplane');
  });

  it('skips cards without a pure-kana target or with extreme lengths', () => {
    const words = pickKanaWords([
      card({ id: 'a', word: '漢字', reading: '' }), // no kana form
      card({ id: 'b', word: 'ん', reading: 'ん' }), // too short
      card({ id: 'c', reading: 'あいうえおかきくけこ' }), // too long
    ]);
    // falls back to the starter set because no card qualified
    expect(words.length).toBeGreaterThan(0);
    expect(KATAKANA_WORDS.map((w) => w.english)).toContain(words[0].english);
  });

  it('accepts a kana-only word when reading is missing', () => {
    const words = pickKanaWords([card({ word: 'ラーメン', reading: '', meaning: 'ramen' })]);
    expect(words).toHaveLength(1);
    expect(words[0].target).toBe('ラーメン');
    expect(words[0].hint).toBeUndefined();
  });
});
