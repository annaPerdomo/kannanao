import { describe, expect, it } from 'vitest';

import { CHEST_XP, chestVariant, isChestEligible } from '@/lib/chest';

const TODAY = '2026-07-11';

describe('CHEST_XP', () => {
  it('is the flat 100 XP reward', () => {
    expect(CHEST_XP).toBe(100);
  });
});

describe('isChestEligible', () => {
  const base = { lastChestDate: null, today: TODAY, dueCount: 0, fromReview: true };

  it('opens when a review clears the queue and no chest today yet', () => {
    expect(isChestEligible(base)).toBe(true);
    expect(isChestEligible({ ...base, lastChestDate: '2026-07-10' })).toBe(true);
  });

  it('never opens from free play (not a review session)', () => {
    expect(isChestEligible({ ...base, fromReview: false })).toBe(false);
  });

  it('never opens while cards are still due', () => {
    expect(isChestEligible({ ...base, dueCount: 2 })).toBe(false);
  });

  it('opens at most once per local day', () => {
    expect(isChestEligible({ ...base, lastChestDate: TODAY })).toBe(false);
  });

  it('treats undefined last-chest-date like never-opened', () => {
    expect(isChestEligible({ ...base, lastChestDate: undefined })).toBe(true);
  });
});

describe('chestVariant', () => {
  it('is golden only for a perfect clear', () => {
    expect(chestVariant(true)).toBe('gold');
    expect(chestVariant(false)).toBe('wood');
  });
});
