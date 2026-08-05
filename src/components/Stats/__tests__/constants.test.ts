import { describe, expect, it } from 'vitest';

import { aggregateModeBreakdown } from '@/components/Stats/constants';

describe('aggregateModeBreakdown', () => {
  it('groups by mode, defaulting a missing mode to study', () => {
    const result = aggregateModeBreakdown([
      { practice_mode: 'quiz', cards_studied: 5, cards_correct: 4 },
      { practice_mode: 'quiz', cards_studied: 5, cards_correct: 5 },
      { practice_mode: null, cards_studied: 3, cards_correct: 3 },
    ]);

    expect(result).toEqual([
      { mode: 'quiz', sessions: 2, cardsStudied: 10, cardsCorrect: 9, accuracy: 90 },
      { mode: 'study', sessions: 1, cardsStudied: 3, cardsCorrect: 3, accuracy: 100 },
    ]);
  });

  it('sorts by cards studied, not session count', () => {
    const result = aggregateModeBreakdown([
      { practice_mode: 'listen', cards_studied: 1, cards_correct: 1 },
      { practice_mode: 'listen', cards_studied: 1, cards_correct: 1 },
      { practice_mode: 'listen', cards_studied: 1, cards_correct: 1 },
      { practice_mode: 'quiz', cards_studied: 50, cards_correct: 40 },
    ]);

    expect(result.map((r) => r.mode)).toEqual(['quiz', 'listen']);
  });

  it('returns nothing for an empty session list', () => {
    expect(aggregateModeBreakdown([])).toEqual([]);
  });

  it('treats a mode with zero cards studied as 0% accuracy, not NaN', () => {
    const result = aggregateModeBreakdown([
      { practice_mode: 'quiz', cards_studied: 0, cards_correct: 0 },
    ]);
    expect(result[0].accuracy).toBe(0);
  });
});
