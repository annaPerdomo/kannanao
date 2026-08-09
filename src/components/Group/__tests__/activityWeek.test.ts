import { describe, expect, it } from 'vitest';

import { sumLastDays, toHoursMinutes } from '../activityWeek';

describe('sumLastDays', () => {
  it('sums the trailing 7 entries by default', () => {
    expect(sumLastDays([1, 2, 3, 4, 5, 6, 7, 8, 9])).toBe(3 + 4 + 5 + 6 + 7 + 8 + 9);
  });

  it('sums the whole series when it is shorter than the window', () => {
    expect(sumLastDays([1, 2, 3])).toBe(6);
  });

  it('is zero for an empty series', () => {
    expect(sumLastDays([])).toBe(0);
  });

  it('supports a custom window size', () => {
    expect(sumLastDays([1, 2, 3, 4, 5], 2)).toBe(9);
  });
});

describe('toHoursMinutes', () => {
  it('splits seconds into whole hours and remaining minutes', () => {
    expect(toHoursMinutes(3 * 3600 + 20 * 60)).toEqual({ hours: 3, minutes: 20 });
  });

  it('is zero for zero seconds', () => {
    expect(toHoursMinutes(0)).toEqual({ hours: 0, minutes: 0 });
  });

  it('rounds down partial minutes', () => {
    expect(toHoursMinutes(125)).toEqual({ hours: 0, minutes: 2 });
  });
});
