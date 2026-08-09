import type { useTranslations } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { timeAgo } from '../timeAgo';

const NOW = new Date('2026-08-09T12:00:00Z');

/** Echoes the key and its values so each branch is identifiable in the assertion. */
const t = ((key: string, values?: Record<string, unknown>) =>
  values ? `${key}:${Object.values(values)[0]}` : key) as unknown as ReturnType<
  typeof useTranslations
>;

function ago(ms: number): string {
  return new Date(NOW.getTime() - ms).toISOString();
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe('timeAgo', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => vi.useRealTimers());

  it('reads as never with no date', () => {
    expect(timeAgo(null, t)).toBe('never');
  });

  it('reads as just now under a minute', () => {
    expect(timeAgo(ago(59_000), t)).toBe('justNow');
  });

  it('switches to minutes at exactly one minute', () => {
    expect(timeAgo(ago(MINUTE), t)).toBe('minutesAgo:1');
    expect(timeAgo(ago(59 * MINUTE), t)).toBe('minutesAgo:59');
  });

  it('switches to hours at exactly one hour', () => {
    expect(timeAgo(ago(HOUR), t)).toBe('hoursAgo:1');
    expect(timeAgo(ago(23 * HOUR), t)).toBe('hoursAgo:23');
  });

  it('says yesterday for the whole day-one window, then counts days', () => {
    expect(timeAgo(ago(DAY), t)).toBe('yesterday');
    expect(timeAgo(ago(2 * DAY - 1), t)).toBe('yesterday');
    expect(timeAgo(ago(2 * DAY), t)).toBe('daysAgo:2');
  });

  it('counts days for a long-dormant learner', () => {
    expect(timeAgo(ago(45 * DAY), t)).toBe('daysAgo:45');
  });
});
