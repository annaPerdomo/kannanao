import { describe, expect, it } from 'vitest';

import { buildLessonLibrary, unitTitleFromGoal, weekStatus } from '../lessonUnits';

const TODAY = '2026-10-06';

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
