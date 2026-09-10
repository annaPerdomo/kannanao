import { afterEach, describe, expect, it } from 'vitest';

import { formatDate } from '@/components/Group/dueDate';

describe('formatDate', () => {
  const originalTz = process.env.TZ;

  afterEach(() => {
    process.env.TZ = originalTz;
  });

  it('formats a plain date without a timezone shift under a UTC-negative zone', () => {
    process.env.TZ = 'Pacific/Honolulu';
    expect(formatDate('2026-10-01', 'en-US')).toBe('Oct 1');
  });

  it('formats a plain date the same way under UTC', () => {
    process.env.TZ = 'UTC';
    expect(formatDate('2026-10-01', 'en-US')).toBe('Oct 1');
  });

  it('still formats a full timestamp as its real instant', () => {
    process.env.TZ = 'UTC';
    expect(formatDate('2026-10-01T12:00:00Z', 'en-US')).toBe('Oct 1');
  });
});
