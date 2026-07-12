import { describe, expect, it } from 'vitest';

import {
  COMBO_MAX_THRESHOLD,
  COMBO_THRESHOLDS,
  type ComboState,
  comboStep,
  INITIAL_COMBO,
} from '@/lib/combo';

/** Run a whole sequence of answers, collecting the bonus fired at each step. */
function play(answers: boolean[]): { finalCount: number; bonuses: number[] } {
  let state: ComboState = INITIAL_COMBO;
  const bonuses: number[] = [];
  for (const correct of answers) {
    const res = comboStep(state, correct);
    bonuses.push(res.bonusAwarded);
    state = res;
  }
  return { finalCount: state.count, bonuses };
}

describe('COMBO_THRESHOLDS', () => {
  it('are the agreed flat amounts, ascending', () => {
    expect(COMBO_THRESHOLDS.map((t) => [t.count, t.bonus])).toEqual([
      [3, 5],
      [5, 10],
      [10, 25],
    ]);
    expect(COMBO_MAX_THRESHOLD).toBe(10);
  });
});

describe('comboStep — counting', () => {
  it('increments on a correct answer', () => {
    expect(comboStep({ count: 0 }, true).count).toBe(1);
    expect(comboStep({ count: 6 }, true).count).toBe(7);
  });

  it('resets to zero on a wrong answer', () => {
    expect(comboStep({ count: 9 }, false)).toEqual({ count: 0, bonusAwarded: 0 });
    expect(comboStep({ count: 0 }, false)).toEqual({ count: 0, bonusAwarded: 0 });
  });

  it('returns a value usable directly as the next state', () => {
    const next = comboStep({ count: 2 }, true);
    expect(comboStep(next, true).count).toBe(4);
  });
});

describe('comboStep — bonuses fire once each, at the exact threshold', () => {
  it('awards nothing before the first threshold', () => {
    expect(comboStep({ count: 0 }, true).bonusAwarded).toBe(0); // ->1
    expect(comboStep({ count: 1 }, true).bonusAwarded).toBe(0); // ->2
  });

  it('awards +5 at 3, +10 at 5, +25 at 10 — and only on those exact counts', () => {
    expect(comboStep({ count: 2 }, true).bonusAwarded).toBe(5); // ->3
    expect(comboStep({ count: 3 }, true).bonusAwarded).toBe(0); // ->4
    expect(comboStep({ count: 4 }, true).bonusAwarded).toBe(10); // ->5
    expect(comboStep({ count: 8 }, true).bonusAwarded).toBe(0); // ->9
    expect(comboStep({ count: 9 }, true).bonusAwarded).toBe(25); // ->10
  });

  it('earns nothing more once a run passes the top threshold', () => {
    for (let c = 10; c < 20; c++) {
      expect(comboStep({ count: c }, true).bonusAwarded).toBe(0);
    }
  });

  it('over a clean 12-correct run fires each bonus exactly once', () => {
    const { finalCount, bonuses } = play(Array(12).fill(true));
    expect(finalCount).toBe(12);
    // Bonuses land at counts 3, 5, 10 (indices 2, 4, 9).
    expect(bonuses[2]).toBe(5);
    expect(bonuses[4]).toBe(10);
    expect(bonuses[9]).toBe(25);
    expect(bonuses.reduce((a, b) => a + b, 0)).toBe(40);
    expect(bonuses.filter((b) => b > 0)).toHaveLength(3);
  });

  it('re-arms every threshold after a reset', () => {
    // 3 correct (fires +5), one wrong (reset), then 3 correct again (fires +5).
    const { bonuses } = play([true, true, true, false, true, true, true]);
    expect(bonuses).toEqual([0, 0, 5, 0, 0, 0, 5]);
  });

  it('a broken run never reaches the higher thresholds', () => {
    // Never 5 in a row → only the +5 ever fires, and only when 3 are chained.
    const { bonuses } = play([true, true, false, true, true, true, false, true]);
    expect(bonuses.reduce((a, b) => a + b, 0)).toBe(5);
  });
});
