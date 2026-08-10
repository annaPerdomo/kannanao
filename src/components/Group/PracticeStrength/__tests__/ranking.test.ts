import { describe, expect, it } from 'vitest';

import { MIN_MODE_CARDS } from '@/components/Group/modeSample';
import { rankPracticeModes } from '@/components/Group/PracticeStrength/ranking';
import type { GroupActivityModeStat } from '@/hooks/useGroupActivity';

function mode(name: string, cardsStudied: number, accuracy: number): GroupActivityModeStat {
  return {
    mode: name,
    sessions: 1,
    cardsStudied,
    cardsCorrect: Math.round((cardsStudied * accuracy) / 100),
    accuracy,
  };
}

describe('rankPracticeModes', () => {
  it('puts the weakest mode first', () => {
    const ranked = rankPracticeModes([
      mode('study', 100, 90),
      mode('listen', 40, 55),
      mode('review', 60, 72),
    ]);
    expect(ranked.map((m) => m.mode)).toEqual(['listen', 'review', 'study']);
  });

  it('sinks under-sampled modes below every mode with a real reading', () => {
    const ranked = rankPracticeModes([
      mode('listen', MIN_MODE_CARDS - 1, 20),
      mode('study', 80, 95),
    ]);
    expect(ranked.map((m) => m.mode)).toEqual(['study', 'listen']);
    expect(ranked[1].enoughData).toBe(false);
  });

  it('orders under-sampled modes by how much practice they did get', () => {
    const ranked = rankPracticeModes([mode('fill', 2, 50), mode('match', 8, 50)]);
    expect(ranked.map((m) => m.mode)).toEqual(['match', 'fill']);
  });

  it('breaks an accuracy tie with the larger sample', () => {
    const ranked = rankPracticeModes([mode('fill', 20, 60), mode('match', 90, 60)]);
    expect(ranked.map((m) => m.mode)).toEqual(['match', 'fill']);
  });

  it('drops modes with no cards at all', () => {
    expect(rankPracticeModes([mode('quiz', 0, 0)])).toEqual([]);
  });

  it('marks a mode at the floor as having enough data', () => {
    const [entry] = rankPracticeModes([mode('recall', MIN_MODE_CARDS, 70)]);
    expect(entry.enoughData).toBe(true);
  });
});
