import { describe, expect, it } from 'vitest';

import { excludeDeckWords, type KnownWord, rankKnownWords } from '@/lib/knownWords';

function word(overrides: Partial<KnownWord> & { word: string }): KnownWord {
  return {
    reading: overrides.word,
    meaning: 'meaning',
    correctCount: 0,
    lastReviewedAt: null,
    ...overrides,
  };
}

describe('rankKnownWords', () => {
  it('orders by correctCount, most practised first', () => {
    const ranked = rankKnownWords([
      word({ word: 'いぬ', correctCount: 2 }),
      word({ word: 'ねこ', correctCount: 9 }),
      word({ word: 'とり', correctCount: 5 }),
    ]);

    expect(ranked.map((w) => w.word)).toEqual(['ねこ', 'とり', 'いぬ']);
  });

  it('breaks ties on recency, most recent first', () => {
    const ranked = rankKnownWords([
      word({ word: 'old', correctCount: 3, lastReviewedAt: '2026-01-01T00:00:00Z' }),
      word({ word: 'new', correctCount: 3, lastReviewedAt: '2026-08-01T00:00:00Z' }),
    ]);

    expect(ranked.map((w) => w.word)).toEqual(['new', 'old']);
  });

  it('respects the cap and leaves the input untouched', () => {
    const rows = [
      word({ word: 'a', correctCount: 1 }),
      word({ word: 'b', correctCount: 3 }),
      word({ word: 'c', correctCount: 2 }),
    ];

    expect(rankKnownWords(rows, 2).map((w) => w.word)).toEqual(['b', 'c']);
    expect(rows.map((w) => w.word)).toEqual(['a', 'b', 'c']);
  });

  it('returns nothing for a zero cap', () => {
    expect(rankKnownWords([word({ word: 'a' })], 0)).toEqual([]);
  });
});

describe('excludeDeckWords', () => {
  it("removes the target deck's own words and leaves the rest", () => {
    const pool = [
      word({ word: 'ねこ' }),
      word({ word: 'いぬ' }),
      word({ word: '本', reading: 'ほん' }),
    ];

    expect(excludeDeckWords(pool, ['ねこ']).map((w) => w.word)).toEqual(['いぬ', '本']);
  });

  it('matches on the reading too', () => {
    const pool = [word({ word: '本', reading: 'ほん' }), word({ word: 'いぬ' })];

    expect(excludeDeckWords(pool, ['ほん']).map((w) => w.word)).toEqual(['いぬ']);
  });

  it('returns the pool unchanged when there is nothing to exclude', () => {
    const pool = [word({ word: 'ねこ' })];
    expect(excludeDeckWords(pool, [])).toHaveLength(1);
    expect(excludeDeckWords(pool, [''])).toHaveLength(1);
  });
});
