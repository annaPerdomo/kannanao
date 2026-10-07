import { describe, expect, it } from 'vitest';

import type { LessonUnit, LessonUnitWeek } from '@/types/lessonUnit';

import {
  buildLessonLibrary,
  currentWeekSummary,
  nextWeekDates,
  rebaseSchedule,
  shiftDate,
  unitTitleFromGoal,
  weekStatus,
} from '../lessonUnits';

const TODAY = '2026-10-06';

describe('shiftDate', () => {
  it('shifts forward within a month', () => {
    expect(shiftDate('2026-10-06', 7)).toBe('2026-10-13');
  });

  it('shifts backward across a month boundary', () => {
    expect(shiftDate('2026-10-03', -7)).toBe('2026-09-26');
  });

  it('shifts across a year boundary', () => {
    expect(shiftDate('2026-12-29', 7)).toBe('2027-01-05');
  });

  it('passes null through unchanged', () => {
    expect(shiftDate(null, 7)).toBeNull();
  });

  it('returns null for an invalid date', () => {
    expect(shiftDate('not-a-date', 7)).toBeNull();
  });
});

describe('nextWeekDates', () => {
  it('falls a week after the last due date', () => {
    expect(nextWeekDates('2026-10-13', TODAY)).toEqual({
      dueDate: '2026-10-20',
      availableOn: '2026-10-13',
    });
  });

  it('falls a week from today when there is no last due date', () => {
    expect(nextWeekDates(null, TODAY)).toEqual({ dueDate: '2026-10-13', availableOn: TODAY });
  });

  it('falls a week from today when the last due date has already passed', () => {
    expect(nextWeekDates('2026-09-01', TODAY)).toEqual({
      dueDate: '2026-10-13',
      availableOn: TODAY,
    });
  });
});

describe('weekStatus', () => {
  it('is upcoming when availableOn is in the future', () => {
    expect(weekStatus('2026-10-10', null, TODAY)).toBe('upcoming');
  });

  it('is past when dueDate is in the past', () => {
    expect(weekStatus(null, '2026-10-01', TODAY)).toBe('past');
  });

  it('is current otherwise', () => {
    expect(weekStatus('2026-10-01', '2026-10-10', TODAY)).toBe('current');
  });

  it('is current when both dates are null', () => {
    expect(weekStatus(null, null, TODAY)).toBe('current');
  });
});

const schedule = {
  title: 'Week 1 — Food',
  note: null,
  due_date: '2026-10-09',
  available_on: '2026-10-02',
  required_accuracy: null,
  required_mode: null,
};

describe('buildLessonLibrary', () => {
  it('prefers the template over assignment rows for a week', () => {
    const library = buildLessonLibrary({
      plans: [{ id: 'p1', title: 'Unit 1', jlpt_level: 'N5', created_at: '2026-09-01T00:00:00Z' }],
      planDecks: [{ plan_id: 'p1', deck_id: 'd1', position: 0 }],
      decks: [{ id: 'd1', name: 'Food', emoji: '🍜' }],
      templates: [{ deck_id: 'd1', ...schedule }],
      assignments: [
        {
          deck_id: 'd1',
          title: 'Different title',
          note: null,
          due_date: '2026-10-20',
          available_on: null,
          required_accuracy: null,
          required_mode: null,
          completed_at: null,
        },
      ],
      today: TODAY,
    });
    expect(library.units[0].weeks[0].dueDate).toBe('2026-10-09');
    expect(library.units[0].weeks[0].title).toBe('Week 1 — Food');
  });

  it('falls back to the most common assignment tuple when no template exists', () => {
    const common = { ...schedule, title: 'Common' };
    const rare = { ...schedule, title: 'Rare', due_date: '2026-10-05' };
    const library = buildLessonLibrary({
      plans: [{ id: 'p1', title: null, jlpt_level: null, created_at: '2026-09-01T00:00:00Z' }],
      planDecks: [{ plan_id: 'p1', deck_id: 'd1', position: 0 }],
      decks: [{ id: 'd1', name: 'Food', emoji: null }],
      templates: [],
      assignments: [
        { deck_id: 'd1', ...common, completed_at: null },
        { deck_id: 'd1', ...common, completed_at: null },
        { deck_id: 'd1', ...rare, completed_at: null },
      ],
      today: TODAY,
    });
    expect(library.units[0].weeks[0].title).toBe('Common');
  });

  it('breaks a tie between equally common tuples by earliest due date', () => {
    const a = { ...schedule, title: 'A', due_date: '2026-10-09' };
    const b = { ...schedule, title: 'B', due_date: '2026-10-02' };
    const library = buildLessonLibrary({
      plans: [{ id: 'p1', title: null, jlpt_level: null, created_at: '2026-09-01T00:00:00Z' }],
      planDecks: [{ plan_id: 'p1', deck_id: 'd1', position: 0 }],
      decks: [{ id: 'd1', name: 'Food', emoji: null }],
      templates: [],
      assignments: [
        { deck_id: 'd1', ...a, completed_at: null },
        { deck_id: 'd1', ...b, completed_at: null },
      ],
      today: TODAY,
    });
    expect(library.units[0].weeks[0].title).toBe('B');
  });

  it('ignores kana rows (null deck_id) entirely', () => {
    const library = buildLessonLibrary({
      plans: [{ id: 'p1', title: null, jlpt_level: null, created_at: '2026-09-01T00:00:00Z' }],
      planDecks: [{ plan_id: 'p1', deck_id: 'd1', position: 0 }],
      decks: [{ id: 'd1', name: 'Food', emoji: null }],
      templates: [{ deck_id: 'd1', ...schedule }],
      assignments: [
        {
          deck_id: null,
          title: null,
          note: null,
          due_date: null,
          available_on: null,
          required_accuracy: null,
          required_mode: null,
          completed_at: null,
        },
      ],
      today: TODAY,
    });
    expect(library.units[0].weeks[0].learnerCount).toBe(0);
  });

  it('counts finished vs total learners', () => {
    const library = buildLessonLibrary({
      plans: [{ id: 'p1', title: null, jlpt_level: null, created_at: '2026-09-01T00:00:00Z' }],
      planDecks: [{ plan_id: 'p1', deck_id: 'd1', position: 0 }],
      decks: [{ id: 'd1', name: 'Food', emoji: null }],
      templates: [{ deck_id: 'd1', ...schedule }],
      assignments: [
        { deck_id: 'd1', ...schedule, completed_at: '2026-10-03T00:00:00Z' },
        { deck_id: 'd1', ...schedule, completed_at: null },
      ],
      today: TODAY,
    });
    expect(library.units[0].weeks[0].learnerCount).toBe(2);
    expect(library.units[0].weeks[0].finishedCount).toBe(1);
  });

  it('keeps a fully-unscheduled week with null dates and status current', () => {
    const library = buildLessonLibrary({
      plans: [{ id: 'p1', title: null, jlpt_level: null, created_at: '2026-09-01T00:00:00Z' }],
      planDecks: [{ plan_id: 'p1', deck_id: 'd1', position: 0 }],
      decks: [{ id: 'd1', name: 'Food', emoji: null }],
      templates: [],
      assignments: [],
      today: TODAY,
    });
    expect(library.units[0].weeks[0]).toMatchObject({
      dueDate: null,
      availableOn: null,
      status: 'current',
      learnerCount: 0,
    });
  });

  it('lists scheduled decks outside any plan as loose, ordered by due date', () => {
    const library = buildLessonLibrary({
      plans: [],
      planDecks: [],
      decks: [
        { id: 'd1', name: 'Later', emoji: null },
        { id: 'd2', name: 'Sooner', emoji: null },
      ],
      templates: [
        { deck_id: 'd1', ...schedule, due_date: '2026-10-20' },
        { deck_id: 'd2', ...schedule, due_date: '2026-10-09' },
      ],
      assignments: [],
      today: TODAY,
    });
    expect(library.loose.map((w) => w.deckId)).toEqual(['d2', 'd1']);
    expect(library.loose.every((w) => w.week === null)).toBe(true);
  });

  it('orders units newest first and numbers weeks sequentially after a gap in positions', () => {
    const library = buildLessonLibrary({
      plans: [
        { id: 'old', title: 'Old unit', jlpt_level: null, created_at: '2026-01-01T00:00:00Z' },
        { id: 'new', title: 'New unit', jlpt_level: null, created_at: '2026-09-01T00:00:00Z' },
      ],
      planDecks: [
        { plan_id: 'old', deck_id: 'd1', position: 0 },
        { plan_id: 'new', deck_id: 'd2', position: 0 },
        { plan_id: 'new', deck_id: 'd3', position: 2 },
        { plan_id: 'new', deck_id: 'd4', position: 5 },
      ],
      decks: [
        { id: 'd1', name: 'A', emoji: null },
        { id: 'd2', name: 'B', emoji: null },
        { id: 'd3', name: 'C', emoji: null },
        { id: 'd4', name: 'D', emoji: null },
      ],
      templates: [],
      assignments: [],
      today: TODAY,
    });
    expect(library.units.map((u) => u.id)).toEqual(['new', 'old']);
    expect(library.units[0].weeks.map((w) => w.week)).toEqual([1, 2, 3]);
  });

  it('reads wordCount from cardCounts, defaulting to 0', () => {
    const library = buildLessonLibrary({
      plans: [{ id: 'p1', title: null, jlpt_level: null, created_at: '2026-09-01T00:00:00Z' }],
      planDecks: [
        { plan_id: 'p1', deck_id: 'd1', position: 0 },
        { plan_id: 'p1', deck_id: 'd2', position: 1 },
      ],
      decks: [
        { id: 'd1', name: 'Food', emoji: null },
        { id: 'd2', name: 'Travel', emoji: null },
      ],
      cardCounts: { d1: 12 },
      templates: [],
      assignments: [],
      today: TODAY,
    });
    expect(library.units[0].weeks[0].wordCount).toBe(12);
    expect(library.units[0].weeks[1].wordCount).toBe(0);
  });

  it('drops a unit with zero weeks', () => {
    const library = buildLessonLibrary({
      plans: [{ id: 'p1', title: null, jlpt_level: null, created_at: '2026-09-01T00:00:00Z' }],
      planDecks: [],
      decks: [],
      templates: [],
      assignments: [],
      today: TODAY,
    });
    expect(library.units).toEqual([]);
  });
});

describe('unitTitleFromGoal', () => {
  it('takes the first non-empty line, trimmed and whitespace-collapsed', () => {
    expect(unitTitleFromGoal('  Family & Hobbies  \n\nSecond line')).toBe('Family & Hobbies');
  });

  it('skips leading blank lines', () => {
    expect(unitTitleFromGoal('\n\n  Travel words')).toBe('Travel words');
  });

  it('truncates a long line to 59 chars plus an ellipsis', () => {
    const longLine = 'x'.repeat(80);
    const result = unitTitleFromGoal(longLine);
    expect(result).toHaveLength(60);
    expect(result?.endsWith('…')).toBe(true);
  });

  it('returns null for a blank goal', () => {
    expect(unitTitleFromGoal('   \n   ')).toBeNull();
  });
});

function makeWeek(overrides: Partial<LessonUnitWeek> = {}): LessonUnitWeek {
  return {
    deckId: 'd1',
    deckName: 'Food',
    deckEmoji: null,
    week: 1,
    title: null,
    note: null,
    dueDate: null,
    availableOn: null,
    requiredAccuracy: null,
    requiredMode: null,
    learnerCount: 0,
    finishedCount: 0,
    wordCount: 0,
    status: 'current',
    ...overrides,
  };
}

function makeUnit(weeks: LessonUnitWeek[]): LessonUnit {
  return { id: 'u1', title: 'Unit 1', level: null, createdAt: '2026-09-01T00:00:00Z', weeks };
}

describe('currentWeekSummary', () => {
  it('picks the current week mid-unit and the week immediately before it', () => {
    const unit = makeUnit([
      makeWeek({ week: 1, status: 'past', learnerCount: 10, finishedCount: 9 }),
      makeWeek({ week: 2, status: 'current', learnerCount: 10, finishedCount: 3 }),
      makeWeek({ week: 3, status: 'upcoming' }),
    ]);
    expect(currentWeekSummary(unit)).toEqual({
      current: 2,
      total: 3,
      lastFinished: { finished: 9, learners: 10 },
    });
  });

  it('falls back to the first upcoming week when nothing is current', () => {
    const unit = makeUnit([
      makeWeek({ week: 1, status: 'upcoming' }),
      makeWeek({ week: 2, status: 'upcoming' }),
    ]);
    expect(currentWeekSummary(unit).current).toBe(1);
  });

  it('reports current and lastFinished both null when every week is past', () => {
    const unit = makeUnit([
      makeWeek({ week: 1, status: 'past', learnerCount: 5, finishedCount: 5 }),
      makeWeek({ week: 2, status: 'past', learnerCount: 5, finishedCount: 4 }),
    ]);
    const summary = currentWeekSummary(unit);
    expect(summary.current).toBeNull();
    expect(summary.lastFinished).toBeNull();
  });

  it('reports no lastFinished when the previous week has no learners yet', () => {
    const unit = makeUnit([
      makeWeek({ week: 1, status: 'past', learnerCount: 0, finishedCount: 0 }),
      makeWeek({ week: 2, status: 'current', learnerCount: 0, finishedCount: 0 }),
    ]);
    expect(currentWeekSummary(unit).lastFinished).toBeNull();
  });

  it('reports no lastFinished when there is no week immediately before the current one', () => {
    const unit = makeUnit([
      makeWeek({ week: 1, status: 'current', learnerCount: 10, finishedCount: 5 }),
    ]);
    expect(currentWeekSummary(unit).lastFinished).toBeNull();
  });

  it('ignores an older finished week that is not directly before the current one', () => {
    const unit = makeUnit([
      makeWeek({ week: 1, status: 'past', learnerCount: 10, finishedCount: 10 }),
      makeWeek({ week: 3, status: 'current', learnerCount: 10, finishedCount: 0 }),
    ]);
    expect(currentWeekSummary(unit).lastFinished).toBeNull();
  });
});

describe('rebaseSchedule', () => {
  it('rebases a plain weekly schedule to a new first due date', () => {
    const weeks = [
      { dueDate: '2026-09-01', availableOn: '2026-08-25' },
      { dueDate: '2026-09-08', availableOn: '2026-09-01' },
      { dueDate: '2026-09-15', availableOn: '2026-09-08' },
    ];
    expect(rebaseSchedule(weeks, '2026-10-06')).toEqual([
      { dueDate: '2026-10-06', availableOn: '2026-09-29' },
      { dueDate: '2026-10-13', availableOn: '2026-10-06' },
      { dueDate: '2026-10-20', availableOn: '2026-10-13' },
    ]);
  });

  it('preserves a holiday gap larger than a week', () => {
    const weeks = [
      { dueDate: '2026-09-01', availableOn: '2026-08-25' },
      { dueDate: '2026-09-15', availableOn: '2026-09-08' },
    ];
    expect(rebaseSchedule(weeks, '2026-10-06')).toEqual([
      { dueDate: '2026-10-06', availableOn: '2026-09-29' },
      { dueDate: '2026-10-20', availableOn: '2026-10-13' },
    ]);
  });

  it('gives a leading null due date the new first due date, and later nulls the previous due date plus 7', () => {
    const weeks = [
      { dueDate: null, availableOn: null },
      { dueDate: null, availableOn: null },
    ];
    expect(rebaseSchedule(weeks, '2026-10-06')).toEqual([
      { dueDate: '2026-10-06', availableOn: '2026-09-29' },
      { dueDate: '2026-10-13', availableOn: '2026-10-06' },
    ]);
  });

  it('falls back to due minus 7 when availableOn is null', () => {
    const weeks = [{ dueDate: '2026-09-01', availableOn: null }];
    expect(rebaseSchedule(weeks, '2026-10-06')).toEqual([
      { dueDate: '2026-10-06', availableOn: '2026-09-29' },
    ]);
  });

  it('clamps availableOn to dueDate when the source gap is negative', () => {
    const weeks = [{ dueDate: '2026-09-01', availableOn: '2026-09-03' }];
    expect(rebaseSchedule(weeks, '2026-10-06')).toEqual([
      { dueDate: '2026-10-06', availableOn: '2026-10-06' },
    ]);
  });

  // Not a goal: dated offsets are never clamped, so a null-filled week
  // (previous + 7) can land on the same date as the dated week after it.
  it('documents a middle null colliding with the dated week after it', () => {
    const weeks = [
      { dueDate: '2026-09-01', availableOn: '2026-08-25' },
      { dueDate: null, availableOn: null },
      { dueDate: '2026-09-08', availableOn: '2026-09-01' },
    ];
    expect(rebaseSchedule(weeks, '2026-10-06')).toEqual([
      { dueDate: '2026-10-06', availableOn: '2026-09-29' },
      { dueDate: '2026-10-13', availableOn: '2026-10-06' },
      { dueDate: '2026-10-13', availableOn: '2026-10-06' },
    ]);
  });

  // Same collision, different cause: the leading null anchors to firstDueDate,
  // and the dated week's zero offset (from that same source due date) lands there too.
  it('documents a leading null colliding with the dated week after it', () => {
    const weeks = [
      { dueDate: null, availableOn: null },
      { dueDate: '2026-09-08', availableOn: '2026-09-01' },
    ];
    expect(rebaseSchedule(weeks, '2026-10-06')).toEqual([
      { dueDate: '2026-10-06', availableOn: '2026-09-29' },
      { dueDate: '2026-10-06', availableOn: '2026-09-29' },
    ]);
  });
});
