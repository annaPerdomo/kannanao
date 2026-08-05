import { describe, expect, it } from 'vitest';

import { aggregateMasteryByUser, cardStrength, countStrengths } from '@/lib/cardStrength';
import type { CardProgress } from '@/lib/supabase';

const row = (overrides: Partial<CardProgress> = {}): CardProgress => ({
  cardId: 'c1',
  correctCount: 3,
  wrongCount: 0,
  lastReviewedAt: null,
  nextReviewAt: '2026-08-10T00:00:00.000Z',
  intervalDays: 6,
  ease: 2.5,
  ...overrides,
});

describe('cardStrength', () => {
  it('calls a card with no progress row new', () => {
    expect(cardStrength(undefined)).toBe('new');
  });

  it('calls a long, healthy interval strong', () => {
    expect(cardStrength(row())).toBe('strong');
  });

  it('drops a card back to learning the moment it is missed', () => {
    // A wrong answer resets the interval to 0 and knocks 0.2 off the ease.
    expect(cardStrength(row({ intervalDays: 0, ease: 2.3 }))).toBe('learning');
  });

  it('keeps a card that is scheduled but shaky out of strong', () => {
    expect(cardStrength(row({ intervalDays: 10, ease: 1.9 }))).toBe('learning');
  });

  it('holds a card just below the interval cutoff at learning', () => {
    expect(cardStrength(row({ intervalDays: 1 }))).toBe('learning');
  });
});

describe('countStrengths', () => {
  it('tiers every card in the deck, absent rows included', () => {
    const progress = [
      row({ cardId: 'a' }),
      row({ cardId: 'b', intervalDays: 0, ease: 2.3 }),
      // A row for a card in another deck must not be counted here.
      row({ cardId: 'elsewhere' }),
    ];
    expect(countStrengths(['a', 'b', 'c', 'd'], progress)).toEqual({
      new: 2,
      learning: 1,
      strong: 1,
    });
  });

  it('counts an empty deck as nothing at all', () => {
    expect(countStrengths([], [])).toEqual({ new: 0, learning: 0, strong: 0 });
  });
});

describe('aggregateMasteryByUser', () => {
  it("splits each user's rows into learning vs strong, never new", () => {
    const byUser = aggregateMasteryByUser([
      { userId: 'u1', intervalDays: 6, ease: 2.5 }, // strong
      { userId: 'u1', intervalDays: 0, ease: 2.3 }, // learning
      { userId: 'u2', intervalDays: 10, ease: 2.1 }, // strong
    ]);

    expect(byUser.get('u1')).toEqual({ learning: 1, strong: 1 });
    expect(byUser.get('u2')).toEqual({ learning: 0, strong: 1 });
  });

  it('omits a user entirely when they have no rows', () => {
    const byUser = aggregateMasteryByUser([]);
    expect(byUser.get('u1')).toBeUndefined();
  });
});
