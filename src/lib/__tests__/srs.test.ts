import { describe, expect, it } from 'vitest';

import {
  isLapse,
  LAPSE_INTERVAL_DAYS,
  MAX_EASE,
  MAX_INTERVAL_DAYS,
  MIN_EASE,
  nextSchedule,
  WRONG_REVIEW_DELAY_MIN,
} from '../srs';

// Fixed clock so every nextReviewAt assertion is deterministic.
const NOW = new Date('2026-07-11T12:00:00.000Z');
const DAY_MS = 86_400_000;

function daysFromNow(result: { nextReviewAt: Date }): number {
  return Math.round((result.nextReviewAt.getTime() - NOW.getTime()) / DAY_MS);
}

describe('nextSchedule — correct answers grow the interval', () => {
  it('first correct answer: interval 0 → 1 day', () => {
    const r = nextSchedule({ correct: true, intervalDays: 0, ease: 2.5 }, NOW);
    expect(r.intervalDays).toBe(1);
    expect(daysFromNow(r)).toBe(1);
  });

  it('second correct answer: interval 1 → 3 days', () => {
    const r = nextSchedule({ correct: true, intervalDays: 1, ease: 2.5 }, NOW);
    expect(r.intervalDays).toBe(3);
    expect(daysFromNow(r)).toBe(3);
  });

  it('third+ correct answer: interval × ease', () => {
    const r = nextSchedule({ correct: true, intervalDays: 3, ease: 2.5 }, NOW);
    expect(r.intervalDays).toBeCloseTo(7.5, 5); // 3 × 2.5
  });

  it('a fractional current interval still multiplies by ease', () => {
    const r = nextSchedule({ correct: true, intervalDays: 7.5, ease: 2.55 }, NOW);
    expect(r.intervalDays).toBeCloseTo(19.125, 5); // 7.5 × 2.55
  });

  it('ease rises by 0.05 per correct answer', () => {
    const r = nextSchedule({ correct: true, intervalDays: 3, ease: 2.5 }, NOW);
    expect(r.ease).toBeCloseTo(2.55, 5);
  });
});

describe('nextSchedule — wrong answers reset the interval', () => {
  it('resets interval to 0 and schedules a ~10 minute retry', () => {
    const r = nextSchedule({ correct: false, intervalDays: 20, ease: 2.5 }, NOW);
    expect(r.intervalDays).toBe(0);
    expect(r.nextReviewAt.getTime()).toBe(NOW.getTime() + WRONG_REVIEW_DELAY_MIN * 60_000);
  });

  it('drops ease by 0.2', () => {
    const r = nextSchedule({ correct: false, intervalDays: 20, ease: 2.5 }, NOW);
    expect(r.ease).toBeCloseTo(2.3, 5);
  });
});

describe('nextSchedule — floors and caps', () => {
  it('never lets ease fall below the floor', () => {
    const r = nextSchedule({ correct: false, intervalDays: 5, ease: MIN_EASE }, NOW);
    expect(r.ease).toBe(MIN_EASE);
  });

  it('never lets ease rise above the cap', () => {
    const r = nextSchedule({ correct: true, intervalDays: 3, ease: MAX_EASE }, NOW);
    expect(r.ease).toBe(MAX_EASE);
  });

  it('caps a runaway interval at the maximum', () => {
    const r = nextSchedule({ correct: true, intervalDays: 50, ease: 2.8 }, NOW);
    expect(r.intervalDays).toBe(MAX_INTERVAL_DAYS); // 50 × 2.8 = 140 → clamped
    expect(daysFromNow(r)).toBe(MAX_INTERVAL_DAYS);
  });
});

describe('nextSchedule — in-session wrong-then-correct (usePracticeQueue retry)', () => {
  // A card answered wrong is re-asked minutes later in the same session. Under
  // this curve that lands at "wrong → interval 0, retry correct → interval 1
  // day", which is the intended outcome — repeat answers are NOT suppressed.
  it('a missed card that is then re-answered correctly lands at 1 day', () => {
    const afterWrong = nextSchedule({ correct: false, intervalDays: 8, ease: 2.5 }, NOW);
    expect(afterWrong.intervalDays).toBe(0);

    const afterRetry = nextSchedule(
      { correct: true, intervalDays: afterWrong.intervalDays, ease: afterWrong.ease },
      NOW,
    );
    expect(afterRetry.intervalDays).toBe(1);
    expect(afterRetry.ease).toBeCloseTo(2.35, 5); // 2.3 after the miss, +0.05
  });
});

describe('isLapse', () => {
  it('is a lapse only when a card held a week or more is missed', () => {
    expect(isLapse(LAPSE_INTERVAL_DAYS, false)).toBe(true);
    expect(isLapse(30, false)).toBe(true);
  });

  it('is not a lapse while the card is still being learned', () => {
    expect(isLapse(LAPSE_INTERVAL_DAYS - 1, false)).toBe(false);
    expect(isLapse(0, false)).toBe(false);
  });

  it('is never a lapse on a correct answer', () => {
    expect(isLapse(30, true)).toBe(false);
  });
});
