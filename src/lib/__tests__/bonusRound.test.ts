import { beforeEach, describe, expect, it, vi } from 'vitest';

import { bonusRoundsToday, recordBonusRound } from '@/lib/bonusRound';

const TODAY = '2026-09-02';
const TOMORROW = '2026-09-03';

describe('bonusRound', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('starts at 0 with nothing recorded', () => {
    expect(bonusRoundsToday(TODAY)).toBe(0);
  });

  it('counts rounds recorded today', () => {
    recordBonusRound(TODAY);
    recordBonusRound(TODAY);
    expect(bonusRoundsToday(TODAY)).toBe(2);
  });

  it('resets once the local date moves on', () => {
    recordBonusRound(TODAY);
    recordBonusRound(TODAY);
    expect(bonusRoundsToday(TOMORROW)).toBe(0);
  });

  it('reads 0 for a corrupt stored value', () => {
    window.localStorage.setItem('kannanao:bonus-rounds', '{not json');
    expect(bonusRoundsToday(TODAY)).toBe(0);
  });

  it('survives a throwing localStorage', () => {
    const getSpy = vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('quota');
    });
    const setSpy = vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(() => recordBonusRound(TODAY)).not.toThrow();
    expect(bonusRoundsToday(TODAY)).toBe(0);
    getSpy.mockRestore();
    setSpy.mockRestore();
  });
});
