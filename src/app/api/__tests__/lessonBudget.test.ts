import { beforeEach, describe, expect, it, vi } from 'vitest';

const rpc = vi.fn();

vi.mock('@/app/api/group/_lib/serviceSupabase', () => ({
  getServiceSupabase: () => ({ rpc }),
}));

import { consumeLessonBudget, DAILY_LESSON_GENERATIONS } from '@/app/api/group/_lib/lessonBudget';

beforeEach(() => {
  rpc.mockReset();
});

describe('consumeLessonBudget', () => {
  it('claims the allowance atomically, passing the cap to the database', async () => {
    rpc.mockResolvedValue({ data: 3, error: null });

    expect(await consumeLessonBudget('org1', 3)).toBeNull();
    expect(rpc).toHaveBeenCalledWith(
      'consume_lesson_budget',
      expect.objectContaining({
        p_organizer_id: 'org1',
        p_cost: 3,
        p_cap: DAILY_LESSON_GENERATIONS,
      }),
    );
  });

  it('spends against a calendar day, not a rolling window', async () => {
    rpc.mockResolvedValue({ data: 1, error: null });

    await consumeLessonBudget('org1');

    const { p_day: day } = rpc.mock.calls[0][1];
    expect(day).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns 429 when the day is spent', async () => {
    rpc.mockResolvedValue({ data: -1, error: null });

    const res = await consumeLessonBudget('org1');

    expect(res?.status).toBe(429);
    expect((await res?.json()).error).toBeTruthy();
  });

  it('lets the request through when the counter itself is broken', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'connection refused' } });

    expect(await consumeLessonBudget('org1')).toBeNull();
  });
});
