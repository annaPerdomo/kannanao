import { describe, expect, it } from 'vitest';

import en from '@/messages/en.json';
import ja from '@/messages/ja.json';

import {
  buildCounterOptions,
  buildCounterRounds,
  COUNTER_ITEMS,
  COUNTER_MISREADINGS,
  COUNTER_READINGS,
  COUNTER_SERIES,
  counterReading,
  MAX_COUNT,
} from '../countersData';

describe('counter reading tables', () => {
  it.each(COUNTER_SERIES)('has ten distinct readings for %s', (series) => {
    const readings = COUNTER_READINGS[series];
    expect(readings).toHaveLength(MAX_COUNT);
    expect(new Set(readings).size).toBe(MAX_COUNT);
    for (const reading of readings) expect(reading).toMatch(/^[ぁ-ゖー]+$/);
  });

  // The whole point of the game: these are the ones that break the pattern.
  it.each([
    ['tsu', 3, 'みっつ'],
    ['tsu', 4, 'よっつ'],
    ['tsu', 8, 'やっつ'],
    ['tsu', 10, 'とお'],
    ['mai', 4, 'よんまい'],
    ['nin', 1, 'ひとり'],
    ['nin', 2, 'ふたり'],
    ['nin', 4, 'よにん'],
    ['nin', 7, 'しちにん'],
  ] as const)('reads %s %i as %s', (series, count, expected) => {
    expect(counterReading(series, count)).toBe(expected);
  });
});

describe('counter items', () => {
  it('has at least six items per counter series and no duplicate ids', () => {
    const ids = COUNTER_ITEMS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const series of COUNTER_SERIES) {
      expect(COUNTER_ITEMS.filter((i) => i.series === series).length).toBeGreaterThanOrEqual(6);
    }
  });

  // A missing item key throws at render time, so check both locales up front.
  it.each(Object.entries({ en, ja }))('has %s copy for every item', (_locale, messages) => {
    const items = messages.Games.counterGame.items as Record<string, string>;
    for (const item of COUNTER_ITEMS) expect(items[item.id]).toBeTruthy();
  });
});

describe('buildCounterOptions', () => {
  const ALL_READINGS = COUNTER_SERIES.flatMap((s) => COUNTER_READINGS[s]);
  const ALL_MISREADINGS = COUNTER_SERIES.flatMap((s) =>
    Object.values(COUNTER_MISREADINGS[s]).filter((v): v is string => !!v),
  );

  it.each(COUNTER_SERIES)('offers four unique chips including the answer (%s)', (series) => {
    for (let count = 1; count <= MAX_COUNT; count++) {
      const options = buildCounterOptions(series, count);
      expect(options).toHaveLength(4);
      expect(new Set(options).size).toBe(4);
      expect(options).toContain(counterReading(series, count));
      // Every chip is either a real reading or a known learner mistake.
      for (const option of options) {
        expect([...ALL_READINGS, ...ALL_MISREADINGS]).toContain(option);
      }
    }
  });

  it('never offers more than one wrong-form chip in a round', () => {
    for (const series of COUNTER_SERIES) {
      for (let count = 1; count <= MAX_COUNT; count++) {
        const wrongForms = buildCounterOptions(series, count).filter((o) =>
          ALL_MISREADINGS.includes(o),
        );
        expect(wrongForms.length).toBeLessThanOrEqual(1);
      }
    }
  });

  it.each([
    ['mai', 4, 'しまい'],
    ['mai', 7, 'しちまい'],
    ['nin', 4, 'よんにん'],
    ['tsu', 1, 'いちつ'],
  ] as const)('tempts %s %i with the real mistake %s', (series, count, mistake) => {
    expect(buildCounterOptions(series, count)).toContain(mistake);
  });

  it('mixes in a same-number reading from another counter series', () => {
    // さんにん should be temptable with さんまい / みっつ, not just its neighbours.
    const crossSeries = COUNTER_SERIES.filter((s) => s !== 'nin').map((s) => counterReading(s, 3));
    const options = buildCounterOptions('nin', 3);
    expect(options.some((o) => crossSeries.includes(o))).toBe(true);
  });
});

describe('COUNTER_MISREADINGS', () => {
  // A "mistake" that is really a valid reading would mark a right answer wrong.
  it('never contains a reading that is correct for any counter', () => {
    const real = new Set(COUNTER_SERIES.flatMap((s) => COUNTER_READINGS[s]));
    for (const series of COUNTER_SERIES) {
      for (const wrong of Object.values(COUNTER_MISREADINGS[series])) {
        expect(real.has(wrong!)).toBe(false);
      }
    }
  });

  it('is never the answer for the number it targets', () => {
    for (const series of COUNTER_SERIES) {
      for (const [count, wrong] of Object.entries(COUNTER_MISREADINGS[series])) {
        expect(counterReading(series, Number(count))).not.toBe(wrong);
      }
    }
  });
});

describe('buildCounterRounds', () => {
  it('builds the requested number of playable rounds', () => {
    const rounds = buildCounterRounds(9);
    expect(rounds).toHaveLength(9);
    for (const round of rounds) {
      expect(round.count).toBeGreaterThanOrEqual(1);
      expect(round.count).toBeLessThanOrEqual(MAX_COUNT);
      expect(round.answer).toBe(counterReading(round.item.series, round.count));
      expect(round.options).toContain(round.answer);
    }
  });

  it('drills all three counter series in one session', () => {
    const series = new Set(buildCounterRounds(9).map((r) => r.item.series));
    expect(series.size).toBe(COUNTER_SERIES.length);
  });
});
