import { describe, expect, it } from 'vitest';

import { resolveTimeOfDay } from '@/lib/timeOfDay';

/** A local-time Date on a fixed day, so only the hour is under test. */
const at = (hour: number, minute = 0) => new Date(2026, 6, 26, hour, minute);

describe('resolveTimeOfDay', () => {
  it('should call the small hours morning', () => {
    expect(resolveTimeOfDay(at(0))).toBe('morning');
    expect(resolveTimeOfDay(at(11, 59))).toBe('morning');
  });

  it('should switch to afternoon at noon', () => {
    expect(resolveTimeOfDay(at(12))).toBe('afternoon');
    expect(resolveTimeOfDay(at(16, 59))).toBe('afternoon');
  });

  it('should switch to evening at 5pm and stay there until midnight', () => {
    expect(resolveTimeOfDay(at(17))).toBe('evening');
    expect(resolveTimeOfDay(at(23, 59))).toBe('evening');
  });
});
