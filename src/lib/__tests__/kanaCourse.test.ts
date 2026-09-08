import { describe, expect, it } from 'vitest';

import type { GroupKanaCoverage } from '../kanaChartPrintable';
import {
  planKanaCourse,
  planKanaFromDecks,
  rowReadFraction,
  suggestKanaCourseStart,
} from '../kanaCourse';
import { allKana, getSet, HIRAGANA_SETS } from '../kanaCurriculum';

function coverageFor(learnerCount: number, known: string[]): GroupKanaCoverage {
  const knownByKana: Record<string, number> = {};
  for (const kana of known) knownByKana[kana] = learnerCount;
  return { learnerCount, knownByKana };
}

describe('rowReadFraction', () => {
  it('is the lowest fraction among the row own characters', () => {
    const coverage: GroupKanaCoverage = {
      learnerCount: 10,
      knownByKana: { あ: 10, い: 8, う: 10, え: 10, お: 10 },
    };
    expect(rowReadFraction('hira-a', coverage)).toBeCloseTo(0.8);
  });

  it('is 0 with no coverage or an empty group', () => {
    expect(rowReadFraction('hira-a', undefined)).toBe(0);
    expect(rowReadFraction('hira-a', { learnerCount: 0, knownByKana: {} })).toBe(0);
  });
});

describe('suggestKanaCourseStart', () => {
  it('starts at the first row with no coverage', () => {
    expect(suggestKanaCourseStart('hiragana')).toBe('hira-a');
  });

  it('starts at the first row under the threshold with partial coverage', () => {
    // Everyone reads あ; nobody reads か yet.
    const coverage = coverageFor(4, ['あ', 'い', 'う', 'え', 'お']);
    expect(suggestKanaCourseStart('hiragana', coverage)).toBe('hira-ka');
  });

  it('returns null once every row clears the threshold', () => {
    const allHiragana = HIRAGANA_SETS.flatMap((set) => set.entries.map((e) => e.kana));
    const coverage = coverageFor(4, allHiragana);
    expect(suggestKanaCourseStart('hiragana', coverage)).toBeNull();
  });
});

describe('planKanaCourse', () => {
  it('walks the curriculum in order', () => {
    const { weeks } = planKanaCourse({
      script: 'hiragana',
      rowsPerWeek: 2,
      weeks: 2,
      firstDueDate: '2026-09-07',
    });
    expect(weeks).toEqual([
      { index: 1, dueDate: '2026-09-07', setIds: ['hira-a', 'hira-ka'] },
      { index: 2, dueDate: '2026-09-14', setIds: ['hira-sa', 'hira-ta'] },
    ]);
  });

  it('runs hiragana rows before katakana for "both"', () => {
    const { weeks } = planKanaCourse({
      script: 'both',
      fromSetId: 'hira-context',
      rowsPerWeek: 2,
      weeks: 1,
      firstDueDate: '2026-09-07',
    });
    expect(weeks[0].setIds).toEqual(['hira-context', 'kata-a']);
  });

  it('starts from an explicit row, skipping what came before', () => {
    const { weeks } = planKanaCourse({
      script: 'hiragana',
      fromSetId: 'hira-ma',
      rowsPerWeek: 1,
      weeks: 1,
      firstDueDate: '2026-09-07',
    });
    expect(weeks[0].setIds).toEqual(['hira-ma']);
  });

  it('uses the coverage-suggested start when none is given', () => {
    const coverage = coverageFor(4, ['あ', 'い', 'う', 'え', 'お']);
    const { weeks } = planKanaCourse({
      script: 'hiragana',
      rowsPerWeek: 1,
      weeks: 1,
      firstDueDate: '2026-09-07',
      coverage,
    });
    expect(weeks[0].setIds).toEqual(['hira-ka']);
  });

  it('never invents rows past the chart', () => {
    const { weeks } = planKanaCourse({
      script: 'hiragana',
      fromSetId: 'hira-pya',
      rowsPerWeek: 3,
      weeks: 5,
      firstDueDate: '2026-09-07',
    });
    // Only 'hira-pya' and 'hira-context' remain; a 3-per-week, 5-week course
    // must stop after one short week, not five.
    expect(weeks).toEqual([
      { index: 1, dueDate: '2026-09-07', setIds: ['hira-pya', 'hira-context'] },
    ]);
  });

  it('spaces due dates 7 days apart, week N at firstDueDate + 7*(N-1)', () => {
    const { weeks } = planKanaCourse({
      script: 'hiragana',
      rowsPerWeek: 5,
      weeks: 3,
      firstDueDate: '2026-01-01',
    });
    expect(weeks.map((w) => w.dueDate)).toEqual(['2026-01-01', '2026-01-08', '2026-01-15']);
  });
});

describe('planKanaFromDecks', () => {
  it('orders rows by deck due date, leading each by leadDays', () => {
    const { weeks } = planKanaFromDecks({
      needs: [
        { setId: 'hira-ka', firstDueDate: '2026-09-20' },
        { setId: 'hira-a', firstDueDate: '2026-09-13' },
      ],
      rowsPerWeek: 1,
      leadDays: 3,
      today: '2026-09-01',
    });
    expect(weeks).toEqual([
      { index: 1, dueDate: '2026-09-10', setIds: ['hira-a'] },
      { index: 2, dueDate: '2026-09-17', setIds: ['hira-ka'] },
    ]);
  });

  it('never schedules a row before today', () => {
    const { weeks } = planKanaFromDecks({
      needs: [{ setId: 'hira-a', firstDueDate: '2026-09-03' }],
      rowsPerWeek: 1,
      leadDays: 5,
      today: '2026-09-01',
    });
    expect(weeks[0].dueDate).toBe('2026-09-01');
  });

  it('drops rows the group already reads', () => {
    const coverage = coverageFor(4, ['あ', 'い', 'う', 'え', 'お']);
    const { weeks } = planKanaFromDecks({
      needs: [
        { setId: 'hira-a', firstDueDate: '2026-09-13' },
        { setId: 'hira-ka', firstDueDate: '2026-09-13' },
      ],
      coverage,
      rowsPerWeek: 2,
      leadDays: 0,
      today: '2026-09-01',
    });
    expect(weeks[0].setIds).toEqual(['hira-ka']);
  });

  it('schedules a row needed by two decks once, against the earlier deck', () => {
    const { weeks } = planKanaFromDecks({
      needs: [
        { setId: 'hira-a', firstDueDate: '2026-09-20' },
        { setId: 'hira-a', firstDueDate: '2026-09-06' },
      ],
      rowsPerWeek: 1,
      leadDays: 0,
      today: '2026-09-01',
    });
    expect(weeks).toHaveLength(1);
    expect(weeks[0]).toEqual({ index: 1, dueDate: '2026-09-06', setIds: ['hira-a'] });
  });

  it('rolls overflow forward a week rather than doubling a due date', () => {
    const { weeks } = planKanaFromDecks({
      needs: [
        { setId: 'hira-a', firstDueDate: '2026-09-10' },
        { setId: 'hira-ka', firstDueDate: '2026-09-10' },
        { setId: 'hira-sa', firstDueDate: '2026-09-10' },
      ],
      rowsPerWeek: 1,
      leadDays: 0,
      today: '2026-09-01',
    });
    expect(weeks.map((w) => w.dueDate)).toEqual(['2026-09-10', '2026-09-17', '2026-09-24']);
  });

  it('ties on due date settle by curriculum order', () => {
    const { weeks } = planKanaFromDecks({
      needs: [
        { setId: 'hira-ka', firstDueDate: '2026-09-06' },
        { setId: 'hira-a', firstDueDate: '2026-09-06' },
      ],
      rowsPerWeek: 2,
      leadDays: 0,
      today: '2026-09-01',
    });
    expect(weeks[0].setIds).toEqual(['hira-a', 'hira-ka']);
  });
});

describe('planKanaCourse — when there is nothing to teach', () => {
  const readsEverything = {
    learnerCount: 4,
    startedCount: 4,
    knownByKana: Object.fromEntries(allKana('hiragana').map((k) => [k, 4])),
  };

  it('plans nothing for a group that already reads the whole script', () => {
    expect(
      planKanaCourse({
        script: 'hiragana',
        rowsPerWeek: 2,
        weeks: 4,
        firstDueDate: '2026-09-14',
        coverage: readsEverything,
      }).weeks,
    ).toEqual([]);
  });

  it('plans nothing rather than starting at あ when the chosen row is not in the script', () => {
    expect(
      planKanaCourse({
        script: 'katakana',
        fromSetId: 'hira-ka',
        rowsPerWeek: 2,
        weeks: 4,
        firstDueDate: '2026-09-14',
      }).weeks,
    ).toEqual([]);
  });
});

describe('rowReadFraction — who counts as the group', () => {
  it('ignores learners who have never opened Learn Kana', () => {
    const known = Object.fromEntries(getSet('hira-a')!.entries.map((e) => [e.kana, 2]));
    // Two of ten read the row, but only those two have ever answered anything.
    expect(
      rowReadFraction('hira-a', { learnerCount: 10, startedCount: 2, knownByKana: known }),
    ).toBe(1);
    expect(rowReadFraction('hira-a', { learnerCount: 10, knownByKana: known })).toBeCloseTo(0.2);
  });
});
