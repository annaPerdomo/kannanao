import { beforeEach, describe, expect, it } from 'vitest';

import {
  _resetLessonBudget,
  consumeLessonBudget,
  DAILY_LESSON_GENERATIONS,
} from '@/app/api/group/_lib/lessonBudget';

beforeEach(() => {
  _resetLessonBudget();
});

describe('consumeLessonBudget', () => {
  it('allows spending up to the daily cap', () => {
    for (let i = 0; i < DAILY_LESSON_GENERATIONS; i++) {
      expect(consumeLessonBudget('org1')).toBeNull();
    }
    expect(consumeLessonBudget('org1')?.status).toBe(429);
  });

  it('rejects a multi-deck request that would overshoot, without partially spending', () => {
    expect(consumeLessonBudget('org1', DAILY_LESSON_GENERATIONS - 1)).toBeNull();

    expect(consumeLessonBudget('org1', 4)?.status).toBe(429);
    expect(consumeLessonBudget('org1', 1)).toBeNull();
  });

  it('keeps each organizer on their own allowance', () => {
    consumeLessonBudget('org1', DAILY_LESSON_GENERATIONS);

    expect(consumeLessonBudget('org1')?.status).toBe(429);
    expect(consumeLessonBudget('org2')).toBeNull();
  });

  it('tells the caller when to come back', async () => {
    consumeLessonBudget('org1', DAILY_LESSON_GENERATIONS);
    const res = consumeLessonBudget('org1');

    expect(Number(res?.headers.get('Retry-After'))).toBeGreaterThan(0);
    expect((await res?.json()).error).toBeTruthy();
  });
});
