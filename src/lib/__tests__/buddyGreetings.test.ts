import { describe, expect, it } from 'vitest';

import { daysBetween, lastActiveDate, selectGreeting } from '@/lib/buddyGreetings';

const TODAY = '2026-08-16';

describe('daysBetween', () => {
  it('counts whole days between local dates', () => {
    expect(daysBetween('2026-08-13', TODAY)).toBe(3);
    expect(daysBetween(TODAY, TODAY)).toBe(0);
  });

  it('spans month boundaries', () => {
    expect(daysBetween('2026-07-31', '2026-08-02')).toBe(2);
  });

  it('returns 0 for garbage input', () => {
    expect(daysBetween('not-a-date', TODAY)).toBe(0);
    expect(daysBetween(TODAY, '')).toBe(0);
  });
});

describe('lastActiveDate', () => {
  it('picks the most recent stamp across sources', () => {
    expect(lastActiveDate({ adventure: '2026-08-10', session: '2026-08-12', pet: null })).toBe(
      '2026-08-12',
    );
  });

  it('is null before the first heart ever', () => {
    expect(lastActiveDate({})).toBeNull();
    expect(lastActiveDate({ adventure: null, session: null, pet: null })).toBeNull();
  });
});

describe('selectGreeting', () => {
  it('greets a return after a break before anything else', () => {
    expect(selectGreeting(4, { session: '2026-08-10' }, TODAY)).toBe('backAfterBreak');
  });

  it('does not call a short gap a break', () => {
    expect(selectGreeting(0, { session: '2026-08-14' }, TODAY)).toBe('adventureNotDone');
  });

  it('celebrates a fully earned day even one heart from a milestone', () => {
    const stamps = { adventure: TODAY, session: TODAY, pet: TODAY };
    expect(selectGreeting(4, stamps, TODAY)).toBe('allDone');
  });

  it('teases a milestone one heart away', () => {
    expect(selectGreeting(4, { adventure: TODAY, session: '2026-08-15' }, TODAY)).toBe(
      'nearMilestone',
    );
  });

  it('points a brand-new user at the adventure', () => {
    expect(selectGreeting(0, {}, TODAY)).toBe('adventureNotDone');
  });

  it('stays quiet when the adventure is done and nothing is close', () => {
    expect(selectGreeting(7, { adventure: TODAY }, TODAY)).toBeNull();
  });
});
