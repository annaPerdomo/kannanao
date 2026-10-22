import { describe, expect, it } from 'vitest';

import {
  MAX_EASE,
  MAX_INTERVAL_DAYS,
  MIN_EASE,
  nextSchedule,
  WRONG_REVIEW_DELAY_MIN,
} from '../srs';

// Fixed clock so every nextReviewAt assertion is deterministic.
const NOW = new Date('2026-07-11T12:00:00.000Z');
const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

function daysFromNow(result: { nextReviewAt: Date }): number {
  return Math.round((result.nextReviewAt.getTime() - NOW.getTime()) / DAY_MS);
}

function hoursAgo(h: number): Date {
  return new Date(NOW.getTime() - h * HOUR_MS);
}

function daysAgo(d: number): Date {
  return new Date(NOW.getTime() - d * DAY_MS);
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

describe('nextSchedule — same sitting and overdue credit', () => {
  it('1. new card correct → 1 day', () => {
    const r = nextSchedule(
      { correct: true, intervalDays: 0, ease: 2.5, lastReviewedAt: null },
      NOW,
    );
    expect(r.intervalDays).toBe(1);
  });

  it('2. interval 1, answered again 2 hours later correct → stays 1, ease unchanged', () => {
    const r = nextSchedule(
      { correct: true, intervalDays: 1, ease: 2.5, lastReviewedAt: hoursAgo(2) },
      NOW,
    );
    expect(r.intervalDays).toBe(1);
    expect(r.ease).toBe(2.5);
  });

  it('3. interval 1, answered 1 day later correct → 3', () => {
    const r = nextSchedule(
      { correct: true, intervalDays: 1, ease: 2.5, lastReviewedAt: daysAgo(1) },
      NOW,
    );
    expect(r.intervalDays).toBe(3);
  });

  it('4. interval 3 ease 2.5, answered 3 days later → 7.5', () => {
    const r = nextSchedule(
      { correct: true, intervalDays: 3, ease: 2.5, lastReviewedAt: daysAgo(3) },
      NOW,
    );
    expect(r.intervalDays).toBeCloseTo(7.5, 5);
  });

  it('5. interval 3 ease 2.5, answered 27 days later → (3 + 12) × 2.5 = 37.5', () => {
    const r = nextSchedule(
      { correct: true, intervalDays: 3, ease: 2.5, lastReviewedAt: daysAgo(27) },
      NOW,
    );
    expect(r.intervalDays).toBeCloseTo(37.5, 5);
  });

  it('6. overdue credit respects the 60-day cap', () => {
    const r = nextSchedule(
      { correct: true, intervalDays: 30, ease: 2.8, lastReviewedAt: daysAgo(100) },
      NOW,
    );
    expect(r.intervalDays).toBe(MAX_INTERVAL_DAYS);
  });

  it('7. interval 1, answered 10 days late correct → greatest(3, (1 + 4.5) × ease)', () => {
    const ease = 2.5;
    const r = nextSchedule(
      { correct: true, intervalDays: 1, ease, lastReviewedAt: daysAgo(10) },
      NOW,
    );
    expect(r.intervalDays).toBeCloseTo(Math.max(3, (1 + 4.5) * ease), 5);
  });

  it('8. wrong twice within 12 hours → ease drops once', () => {
    const firstWrong = nextSchedule(
      { correct: false, intervalDays: 1, ease: 2.5, lastReviewedAt: daysAgo(1) },
      NOW,
    );
    expect(firstWrong.intervalDays).toBe(0);
    expect(firstWrong.ease).toBeCloseTo(2.3, 5);

    const secondWrong = nextSchedule(
      {
        correct: false,
        intervalDays: firstWrong.intervalDays,
        ease: firstWrong.ease,
        lastReviewedAt: hoursAgo(2),
      },
      NOW,
    );
    expect(secondWrong.ease).toBe(firstWrong.ease);
  });

  it('9. wrong after a day → ease drops', () => {
    const r = nextSchedule(
      { correct: false, intervalDays: 0, ease: 2.3, lastReviewedAt: daysAgo(1) },
      NOW,
    );
    expect(r.ease).toBeCloseTo(2.1, 5);
  });
});

describe('nextSchedule — retry loop does not double-punish one miss', () => {
  it('miss → retry right → miss → retry right → miss, all within 12h, drops ease exactly once', () => {
    const miss1 = nextSchedule(
      { correct: false, intervalDays: 5, ease: 2.5, lastReviewedAt: daysAgo(3) },
      NOW,
    );
    expect(miss1.ease).toBeCloseTo(2.3, 5);

    const retry1 = nextSchedule(
      { correct: true, intervalDays: miss1.intervalDays, ease: miss1.ease, lastReviewedAt: NOW },
      NOW,
    );
    expect(retry1.intervalDays).toBe(1);
    expect(retry1.ease).toBe(miss1.ease);

    const miss2 = nextSchedule(
      { correct: false, intervalDays: retry1.intervalDays, ease: retry1.ease, lastReviewedAt: NOW },
      NOW,
    );
    expect(miss2.ease).toBe(retry1.ease);

    const retry2 = nextSchedule(
      { correct: true, intervalDays: miss2.intervalDays, ease: miss2.ease, lastReviewedAt: NOW },
      NOW,
    );
    expect(retry2.intervalDays).toBe(1);
    expect(retry2.ease).toBe(miss2.ease);

    const miss3 = nextSchedule(
      { correct: false, intervalDays: retry2.intervalDays, ease: retry2.ease, lastReviewedAt: NOW },
      NOW,
    );
    expect(miss3.ease).toBeCloseTo(2.3, 5);
  });
});

describe('nextSchedule — an early correct answer does not jump the interval', () => {
  it('interval 30 ease 2.5 answered 1 day later → stays 30', () => {
    const r = nextSchedule(
      { correct: true, intervalDays: 30, ease: 2.5, lastReviewedAt: daysAgo(1) },
      NOW,
    );
    expect(r.intervalDays).toBe(30);
  });

  it('interval 30 ease 2.5 answered 20 days later → 50', () => {
    const r = nextSchedule(
      { correct: true, intervalDays: 30, ease: 2.5, lastReviewedAt: daysAgo(20) },
      NOW,
    );
    expect(r.intervalDays).toBeCloseTo(50, 5);
  });
});
