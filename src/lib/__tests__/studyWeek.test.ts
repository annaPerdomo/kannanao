import { describe, expect, it } from 'vitest';

import {
  isReturningAfterBreak,
  studyDaySet,
  studyDaysThisWeek,
  weekStartLocal,
} from '@/lib/studyWeek';

// 2026-08-03 is a Monday.
function session(date: Date, cardsStudied = 10) {
  return { started_at: date.toISOString(), cards_studied: cardsStudied };
}

describe('weekStartLocal', () => {
  it('returns the same local midnight on a Monday', () => {
    expect(weekStartLocal(new Date(2026, 7, 3, 15, 30))).toEqual(new Date(2026, 7, 3));
  });

  it('rolls a Sunday back to the previous Monday, not forward', () => {
    expect(weekStartLocal(new Date(2026, 7, 9, 23, 59))).toEqual(new Date(2026, 7, 3));
  });

  it('handles mid-week days and month boundaries', () => {
    expect(weekStartLocal(new Date(2026, 7, 5, 8, 0))).toEqual(new Date(2026, 7, 3));
    // Sat Aug 1 belongs to the week starting Mon Jul 27.
    expect(weekStartLocal(new Date(2026, 7, 1))).toEqual(new Date(2026, 6, 27));
  });
});

describe('studyDaysThisWeek', () => {
  it('excludes a Sunday session from the following Monday week', () => {
    const sunday = new Date(2026, 7, 2, 20, 0);
    const now = new Date(2026, 7, 4, 12, 0);
    expect(studyDaysThisWeek([session(sunday)], now)).toBe(0);
  });

  it('counts a Monday 00:01 session', () => {
    const mondayEarly = new Date(2026, 7, 3, 0, 1);
    const now = new Date(2026, 7, 4, 12, 0);
    expect(studyDaysThisWeek([session(mondayEarly)], now)).toBe(1);
  });

  it('dedupes multiple sessions on the same local day', () => {
    const now = new Date(2026, 7, 4, 22, 0);
    const sessions = [
      session(new Date(2026, 7, 4, 8, 0)),
      session(new Date(2026, 7, 4, 12, 0)),
      session(new Date(2026, 7, 4, 21, 0)),
    ];
    expect(studyDaysThisWeek(sessions, now)).toBe(1);
  });

  it('counts distinct days across the week', () => {
    const now = new Date(2026, 7, 6, 18, 0);
    const sessions = [
      session(new Date(2026, 7, 3, 9, 0)),
      session(new Date(2026, 7, 4, 9, 0)),
      session(new Date(2026, 7, 6, 9, 0)),
    ];
    expect(studyDaysThisWeek(sessions, now)).toBe(3);
  });

  it('excludes rows with zero cards studied', () => {
    const now = new Date(2026, 7, 4, 12, 0);
    expect(studyDaysThisWeek([session(new Date(2026, 7, 3, 9, 0), 0)], now)).toBe(0);
  });

  it('skips rows with unparseable dates', () => {
    const now = new Date(2026, 7, 4, 12, 0);
    const sessions = [
      { started_at: 'not-a-date', cards_studied: 10 },
      session(new Date(2026, 7, 4, 9, 0)),
    ];
    expect(studyDaysThisWeek(sessions, now)).toBe(1);
  });
});

describe('studyDaySet', () => {
  it('returns the exact days the count is built from', () => {
    const now = new Date(2026, 7, 6, 18, 0);
    const sessions = [session(new Date(2026, 7, 3, 9, 0)), session(new Date(2026, 7, 6, 9, 0))];
    expect([...studyDaySet(sessions, now)].sort()).toEqual(['2026-08-03', '2026-08-06']);
  });

  it('drops a session dated after now', () => {
    const now = new Date(2026, 7, 5, 12, 0);
    const sessions = [session(new Date(2026, 7, 5, 9, 0)), session(new Date(2026, 7, 7, 9, 0))];
    expect([...studyDaySet(sessions, now)]).toEqual(['2026-08-05']);
  });
});

describe('isReturningAfterBreak', () => {
  const TODAY = '2026-08-09';
  const YESTERDAY = '2026-08-08';

  it('is false for a brand-new user (no last study date)', () => {
    expect(isReturningAfterBreak(null, TODAY, YESTERDAY)).toBe(false);
  });

  it('is false when they studied today or yesterday', () => {
    expect(isReturningAfterBreak(TODAY, TODAY, YESTERDAY)).toBe(false);
    expect(isReturningAfterBreak(YESTERDAY, TODAY, YESTERDAY)).toBe(false);
  });

  it('is true after a gap of two days or more', () => {
    expect(isReturningAfterBreak('2026-08-07', TODAY, YESTERDAY)).toBe(true);
    expect(isReturningAfterBreak('2026-06-01', TODAY, YESTERDAY)).toBe(true);
  });
});
