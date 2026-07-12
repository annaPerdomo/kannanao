import { describe, expect, it } from 'vitest';

import { evaluateMastery, goalLabel, isGoalMode, MASTERY_MIN_CARDS } from '@/lib/assignmentMastery';

const session = (overrides: Partial<Parameters<typeof evaluateMastery>[1]> = {}) => ({
  practice_mode: 'study',
  cards_studied: 10,
  cards_correct: 8,
  ...overrides,
});

describe('evaluateMastery', () => {
  // ── null criteria (legacy assignments) ────────────────────────────────────
  it('completes on any session when both criteria are null', () => {
    const result = evaluateMastery(
      { required_accuracy: null, required_mode: null },
      session({ practice_mode: null, cards_studied: 1, cards_correct: 0 }),
    );
    expect(result).toEqual({ completes: true, qualifyingAccuracy: null });
  });

  // ── mode criterion ────────────────────────────────────────────────────────
  it('completes when the required mode matches and no accuracy is set', () => {
    const result = evaluateMastery(
      { required_accuracy: null, required_mode: 'match' },
      session({ practice_mode: 'match' }),
    );
    expect(result.completes).toBe(true);
  });

  it('does not complete on a mode mismatch', () => {
    const result = evaluateMastery(
      { required_accuracy: null, required_mode: 'match' },
      session({ practice_mode: 'study' }),
    );
    expect(result).toEqual({ completes: false, qualifyingAccuracy: null });
  });

  it('does not complete when required_mode is set and the session has no mode', () => {
    const result = evaluateMastery(
      { required_accuracy: 80, required_mode: 'match' },
      session({ practice_mode: null, cards_studied: 10, cards_correct: 10 }),
    );
    expect(result).toEqual({ completes: false, qualifyingAccuracy: null });
  });

  it('mode mismatch yields no qualifying accuracy even on a perfect session', () => {
    const result = evaluateMastery(
      { required_accuracy: 70, required_mode: 'recall' },
      session({ practice_mode: 'fill', cards_studied: 20, cards_correct: 20 }),
    );
    expect(result.qualifyingAccuracy).toBeNull();
  });

  // ── accuracy criterion ────────────────────────────────────────────────────
  it('completes exactly at the accuracy boundary (4/5 vs 80%)', () => {
    const result = evaluateMastery(
      { required_accuracy: 80, required_mode: null },
      session({ cards_studied: 5, cards_correct: 4 }),
    );
    expect(result).toEqual({ completes: true, qualifyingAccuracy: 80 });
  });

  it('does not complete just below the boundary (7/9 vs 78%)', () => {
    // 7/9 = 77.78% — rounds to 78 for display but must NOT satisfy a 78% goal
    const result = evaluateMastery(
      { required_accuracy: 78, required_mode: null },
      session({ cards_studied: 9, cards_correct: 7 }),
    );
    expect(result.completes).toBe(false);
    expect(result.qualifyingAccuracy).toBe(78);
  });

  it('completes a 100% goal only on a perfect session', () => {
    const perfect = evaluateMastery(
      { required_accuracy: 100, required_mode: null },
      session({ cards_studied: 6, cards_correct: 6 }),
    );
    const nearMiss = evaluateMastery(
      { required_accuracy: 100, required_mode: null },
      session({ cards_studied: 6, cards_correct: 5 }),
    );
    expect(perfect.completes).toBe(true);
    expect(nearMiss.completes).toBe(false);
  });

  it('a 0% goal completes on any session meeting the card floor', () => {
    const result = evaluateMastery(
      { required_accuracy: 0, required_mode: null },
      session({ cards_studied: 5, cards_correct: 0 }),
    );
    expect(result).toEqual({ completes: true, qualifyingAccuracy: 0 });
  });

  // ── the 5-card floor ──────────────────────────────────────────────────────
  it(`rejects a perfect session with fewer than ${MASTERY_MIN_CARDS} cards`, () => {
    const result = evaluateMastery(
      { required_accuracy: 80, required_mode: null },
      session({ cards_studied: 1, cards_correct: 1 }),
    );
    expect(result).toEqual({ completes: false, qualifyingAccuracy: null });
  });

  it('accepts a session with exactly the card floor', () => {
    const result = evaluateMastery(
      { required_accuracy: 80, required_mode: null },
      session({ cards_studied: MASTERY_MIN_CARDS, cards_correct: MASTERY_MIN_CARDS }),
    );
    expect(result.completes).toBe(true);
  });

  it('applies the floor to a zero-card session without dividing by zero', () => {
    const result = evaluateMastery(
      { required_accuracy: 80, required_mode: null },
      session({ cards_studied: 0, cards_correct: 0 }),
    );
    expect(result).toEqual({ completes: false, qualifyingAccuracy: null });
  });

  it('the floor does not gate mode-only goals', () => {
    const result = evaluateMastery(
      { required_accuracy: null, required_mode: 'study' },
      session({ practice_mode: 'study', cards_studied: 2, cards_correct: 0 }),
    );
    expect(result.completes).toBe(true);
  });

  // ── combined criteria ─────────────────────────────────────────────────────
  it('requires BOTH mode and accuracy when both are set', () => {
    const criteria = { required_accuracy: 80, required_mode: 'match' };
    const rightModeLowScore = evaluateMastery(
      criteria,
      session({ practice_mode: 'match', cards_studied: 10, cards_correct: 6 }),
    );
    const bothMet = evaluateMastery(
      criteria,
      session({ practice_mode: 'match', cards_studied: 10, cards_correct: 9 }),
    );
    expect(rightModeLowScore.completes).toBe(false);
    expect(rightModeLowScore.qualifyingAccuracy).toBe(60);
    expect(bothMet.completes).toBe(true);
    expect(bothMet.qualifyingAccuracy).toBe(90);
  });
});

describe('goalLabel', () => {
  it('is null when there is no goal', () => {
    expect(goalLabel({ required_accuracy: null, required_mode: null })).toBeNull();
  });

  it('describes accuracy + mode goals', () => {
    expect(goalLabel({ required_accuracy: 80, required_mode: 'match' })).toBe('80% in Match');
  });

  it('describes accuracy-only goals', () => {
    expect(goalLabel({ required_accuracy: 70, required_mode: null })).toBe('70%');
  });

  it('describes mode-only goals', () => {
    expect(goalLabel({ required_accuracy: null, required_mode: 'kotoba-bubble' })).toBe(
      'practice in Sentence Builder',
    );
  });

  it('falls back to the raw mode string for unknown modes', () => {
    expect(goalLabel({ required_accuracy: 90, required_mode: 'legacy-mode' })).toBe(
      '90% in legacy-mode',
    );
  });
});

describe('isGoalMode', () => {
  it('accepts deck-tied modes and rejects everything else', () => {
    expect(isGoalMode('match')).toBe(true);
    expect(isGoalMode('kotoba-bubble')).toBe(true);
    // speech + arcade modes never carry a deck_id, so they can't be goals
    expect(isGoalMode('speech_read')).toBe(false);
    expect(isGoalMode('word-match')).toBe(false);
    expect(isGoalMode(42)).toBe(false);
    expect(isGoalMode(null)).toBe(false);
  });
});
