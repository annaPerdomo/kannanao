import { describe, expect, it } from 'vitest';

import { availabilityToday, availableNowFilter, isAvailable } from '@/lib/assignmentAvailability';

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
