import { describe, expect, it } from 'vitest';

import { summarizeWordProgress, wordsDone, wordsNeeded } from '../wordProgress';

describe('summarizeWordProgress', () => {
  const cardIds = ['c1', 'c2', 'c3'];
  const since = '2026-01-01T00:00:00Z';

  it('ignores rows older than since', () => {
    const p = summarizeWordProgress(
      cardIds,
      [{ card_id: 'c1', last_reviewed_at: '2025-12-31T00:00:00Z', interval_days: 3 }],
      since,
    );
    expect(p).toEqual({ total: 3, seen: 0, known: 0 });
  });

  it('ignores cards outside cardIds', () => {
    const p = summarizeWordProgress(
      cardIds,
      [{ card_id: 'other', last_reviewed_at: '2026-01-02T00:00:00Z', interval_days: 3 }],
      since,
    );
    expect(p).toEqual({ total: 3, seen: 0, known: 0 });
  });

  it('counts interval_days >= 1 as known', () => {
    const p = summarizeWordProgress(
      cardIds,
      [
        { card_id: 'c1', last_reviewed_at: '2026-01-02T00:00:00Z', interval_days: 1 },
        { card_id: 'c2', last_reviewed_at: '2026-01-02T00:00:00Z', interval_days: 0 },
      ],
      since,
    );
    expect(p).toEqual({ total: 3, seen: 2, known: 1 });
  });
});

describe('wordsDone', () => {
  it('is false when one card is unseen, even at 100% known of seen', () => {
    expect(wordsDone({ total: 3, seen: 2, known: 2 }, 80)).toBe(false);
  });

  it('is true at exactly the baseline', () => {
    expect(wordsDone({ total: 5, seen: 5, known: 4 }, 80)).toBe(true);
  });

  it('is false just under the baseline', () => {
    expect(wordsDone({ total: 5, seen: 5, known: 3 }, 80)).toBe(false);
  });

  it('is true with no cards at all (nothing to answer)', () => {
    expect(wordsDone({ total: 0, seen: 0, known: 0 }, 80)).toBe(true);
  });
});

describe('wordsNeeded', () => {
  it('floors at 0', () => {
    expect(wordsNeeded({ total: 5, seen: 5, known: 5 }, 80)).toBe(0);
  });

  it('rounds up', () => {
    // 80% of 5 = 4, known is 1, so 3 more needed
    expect(wordsNeeded({ total: 5, seen: 5, known: 1 }, 80)).toBe(3);
  });
});
