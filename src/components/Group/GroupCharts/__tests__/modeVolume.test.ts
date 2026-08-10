import { describe, expect, it } from 'vitest';

import type { GroupActivityModeStat } from '@/hooks/useGroupActivity';

import { rankModeVolume } from '../modeVolume';

function stat(mode: string, cardsStudied: number, extra: Partial<GroupActivityModeStat> = {}) {
  return {
    mode,
    sessions: 1,
    cardsStudied,
    cardsCorrect: cardsStudied,
    accuracy: 100,
    ...extra,
  };
}

describe('rankModeVolume', () => {
  it('ranks the busiest mode first', () => {
    const ranked = rankModeVolume([stat('match', 20), stat('study', 60), stat('quiz', 40)]);
    expect(ranked.map((r) => r.mode)).toEqual(['study', 'quiz', 'match']);
  });

  it('scales bars to the busiest mode and shares to the total', () => {
    const ranked = rankModeVolume([stat('study', 60), stat('match', 30), stat('quiz', 10)]);
    expect(ranked.map((r) => Math.round(r.barPct))).toEqual([100, 50, 17]);
    expect(ranked.map((r) => r.share)).toEqual([60, 30, 10]);
  });

  it('drops modes with no cards in the window', () => {
    const ranked = rankModeVolume([stat('study', 12), stat('listen', 0)]);
    expect(ranked.map((r) => r.mode)).toEqual(['study']);
    expect(ranked[0].share).toBe(100);
  });

  it('never reports a studied mode as 0% of the window', () => {
    const ranked = rankModeVolume([stat('study', 5000), stat('listen', 20)]);
    expect(ranked[1].share).toBe(1);
  });

  it('flags a sample too small for its accuracy to mean anything', () => {
    const ranked = rankModeVolume([stat('study', 40), stat('recall', 3)]);
    expect(ranked.map((r) => r.enoughData)).toEqual([true, false]);
  });

  it('breaks a tie on name so the order never flickers between fetches', () => {
    const ranked = rankModeVolume([stat('recall', 10), stat('fill', 10)]);
    expect(ranked.map((r) => r.mode)).toEqual(['fill', 'recall']);
  });

  it('has nothing to rank in an empty window', () => {
    expect(rankModeVolume([])).toEqual([]);
  });
});
