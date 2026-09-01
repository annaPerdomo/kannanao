import { describe, expect, it } from 'vitest';

import {
  evaluateMastery,
  goalLabel,
  isGoalMode,
  MASTERY_MIN_CARDS,
  masteryMinCards,
} from '@/lib/assignmentMastery';

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

  // ── the floor on a deck smaller than the floor ────────────────────────────
  it('lets a deck smaller than the floor complete on the whole deck', () => {
    const result = evaluateMastery(
      { required_accuracy: 80, required_mode: null },
      session({ cards_studied: 3, cards_correct: 3 }),
      3,
    );
    expect(result).toEqual({ completes: true, qualifyingAccuracy: 100 });
  });

  it('still rejects a short session on a deck bigger than the floor', () => {
    const result = evaluateMastery(
      { required_accuracy: 80, required_mode: null },
      session({ cards_studied: 1, cards_correct: 1 }),
      20,
    );
    expect(result).toEqual({ completes: false, qualifyingAccuracy: null });
  });

  it('still rejects a partial session on a small deck', () => {
    const result = evaluateMastery(
      { required_accuracy: 80, required_mode: null },
      session({ cards_studied: 1, cards_correct: 1 }),
      3,
    );
    expect(result).toEqual({ completes: false, qualifyingAccuracy: null });
  });

  it('falls back to the flat floor when the deck size is unknown', () => {
    const result = evaluateMastery(
      { required_accuracy: 80, required_mode: null },
      session({ cards_studied: 3, cards_correct: 3 }),
      null,
    );
    expect(result.completes).toBe(false);
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

describe('evaluateMastery — kana goals', () => {
  const kana = (setId: string) => ({
    required_accuracy: null,
    required_mode: null,
    kana_set: setId,
  });

  it('completes when a set-scoped session drilled the assigned row', () => {
    const result = evaluateMastery(kana('hira-ka'), session({ kana_set: 'hira-ka' }));
    expect(result.completes).toBe(true);
  });

  it('does not complete on a different row', () => {
    const result = evaluateMastery(kana('hira-ka'), session({ kana_set: 'hira-sa' }));
    expect(result).toEqual({ completes: false, qualifyingAccuracy: null });
  });

  it('does not complete on a mixed session, which carries no row at all', () => {
    const result = evaluateMastery(kana('hira-ka'), session({ kana_set: null }));
    expect(result.completes).toBe(false);
  });

  it('grades the accuracy goal on the matching row', () => {
    expect(
      evaluateMastery(
        { ...kana('hira-ka'), required_accuracy: 80 },
        session({ kana_set: 'hira-ka', cards_studied: 10, cards_correct: 8 }),
      ),
    ).toEqual({ completes: true, qualifyingAccuracy: 80 });
    expect(
      evaluateMastery(
        { ...kana('hira-ka'), required_accuracy: 90 },
        session({ kana_set: 'hira-ka', cards_studied: 10, cards_correct: 8 }),
      ),
    ).toEqual({ completes: false, qualifyingAccuracy: 80 });
  });

  it('holds the flat card floor — a kana row has no deck size to shrink it to', () => {
    const result = evaluateMastery(
      { ...kana('hira-ka'), required_accuracy: 80 },
      session({ kana_set: 'hira-ka', cards_studied: MASTERY_MIN_CARDS - 1, cards_correct: 4 }),
      3,
    );
    expect(result).toEqual({ completes: false, qualifyingAccuracy: null });
  });

  it('ignores required_mode, which means nothing for a kana row', () => {
    const result = evaluateMastery(
      { ...kana('hira-ka'), required_mode: 'match' },
      session({ kana_set: 'hira-ka', practice_mode: 'kana-journey' }),
    );
    expect(result.completes).toBe(true);
  });

  it('leaves the mode out of a kana goal label', () => {
    expect(goalLabel({ required_accuracy: 90, required_mode: 'match', kana_set: 'hira-ka' })).toBe(
      '90%',
    );
    expect(
      goalLabel({ required_accuracy: null, required_mode: 'match', kana_set: 'hira-ka' }),
    ).toBe(null);
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

describe('masteryMinCards', () => {
  it('caps the floor at the deck size', () => {
    expect(masteryMinCards(3)).toBe(3);
    expect(masteryMinCards(1)).toBe(1);
  });

  it('keeps the flat floor for decks at or above it', () => {
    expect(masteryMinCards(MASTERY_MIN_CARDS)).toBe(MASTERY_MIN_CARDS);
    expect(masteryMinCards(50)).toBe(MASTERY_MIN_CARDS);
  });

  it('keeps the flat floor when the count is unknown or nonsense', () => {
    expect(masteryMinCards(null)).toBe(MASTERY_MIN_CARDS);
    expect(masteryMinCards(undefined)).toBe(MASTERY_MIN_CARDS);
    expect(masteryMinCards(0)).toBe(MASTERY_MIN_CARDS);
  });
});
