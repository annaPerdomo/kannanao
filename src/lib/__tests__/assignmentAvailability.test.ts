import { describe, expect, it } from 'vitest';

import {
  availabilityToday,
  availableNowFilter,
  isAvailable,
  openKanaSetIds,
} from '@/lib/assignmentAvailability';

describe('availabilityToday', () => {
  it('is a plain date, which is what available_on stores', () => {
    expect(availabilityToday(new Date('2026-08-03T12:00:00Z'))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('reads the same day on the server and in the browser', () => {
    // The deck library computes this client-side and the assignment list
    // server-side. A different answer on the two sides shows a learner a deck
    // whose assignment says it hasn't started.
    const noon = new Date('2026-08-03T19:00:00Z');
    expect(availabilityToday(noon)).toBe('2026-08-03');
  });
});

describe('availableNowFilter', () => {
  it('matches assignments with no start date and ones already started', () => {
    // Every assignment created before the column existed has a null start.
    expect(availableNowFilter('2026-08-03')).toBe(
      'available_on.is.null,available_on.lte.2026-08-03',
    );
  });
});

describe('isAvailable', () => {
  it('treats a missing start date as available now', () => {
    expect(isAvailable(null, '2026-08-03')).toBe(true);
    expect(isAvailable(undefined, '2026-08-03')).toBe(true);
  });

  it('opens on the start date, not the day after', () => {
    expect(isAvailable('2026-08-03', '2026-08-03')).toBe(true);
  });

  it('hides a week that has not started', () => {
    expect(isAvailable('2026-08-10', '2026-08-03')).toBe(false);
  });
});

describe('openKanaSetIds', () => {
  const row = (
    kana_set: string | null,
    extra: Partial<{ completed_at: string | null; available_on: string | null }> = {},
  ) => ({
    kana_set,
    completed_at: null,
    available_on: null,
    ...extra,
  });

  it('keeps only open, available kana rows and drops deck assignments', () => {
    expect(
      openKanaSetIds([
        row(null),
        row('hira-ka'),
        row('hira-a', { completed_at: '2026-09-01' }),
        row('hira-sa', { available_on: '2099-01-01' }),
      ]),
    ).toEqual(['hira-ka']);
  });

  it('returns curriculum order and dedupes, whatever the list order', () => {
    expect(openKanaSetIds([row('hira-ka'), row('hira-a'), row('hira-ka')])).toEqual([
      'hira-a',
      'hira-ka',
    ]);
  });
});
