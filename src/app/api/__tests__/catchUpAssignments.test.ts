import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { catchUpGroupAssignments } from '@/app/api/join/_lib/catchUpAssignments';

let groupRows: Record<string, unknown>[];
let readError: { message: string } | null;
let insertError: { message: string } | null;
const inserted: Record<string, unknown>[][] = [];

function fakeClient(): SupabaseClient {
  const chain: Record<string, unknown> = {};
  ['select', 'eq', 'or'].forEach((m) => {
    chain[m] = vi.fn(() => chain);
  });
  chain.upsert = vi.fn((rows: Record<string, unknown>[]) => {
    inserted.push(rows);
    return Promise.resolve({ error: insertError });
  });
  chain.then = (ok: (v: unknown) => unknown) =>
    Promise.resolve({ data: groupRows, error: readError }).then(ok);
  return { from: () => chain } as unknown as SupabaseClient;
}

const ARGS = {
  groupId: 'g1',
  organizerId: 'org1',
  memberId: 'newbie',
  today: '2026-08-03',
  route: 'test',
};

const handout = (overrides: Record<string, unknown> = {}) => ({
  member_id: 'classmate',
  deck_id: 'd1',
  title: 'Week 1',
  note: null,
  due_date: '2026-08-09',
  available_on: null,
  required_accuracy: null,
  required_mode: null,
  ...overrides,
});

beforeEach(() => {
  groupRows = [];
  readError = null;
  insertError = null;
  inserted.length = 0;
});

describe('catchUpGroupAssignments', () => {
  it('gives the joiner one copy of each handout the group already has', async () => {
    // Two classmates hold the same handout; the joiner needs it once.
    groupRows = [handout(), handout({ member_id: 'classmate2' })];

    const count = await catchUpGroupAssignments(fakeClient(), ARGS);

    expect(count).toBe(1);
    expect(inserted[0]).toEqual([
      expect.objectContaining({
        member_id: 'newbie',
        group_id: 'g1',
        organizer_id: 'org1',
        deck_id: 'd1',
        title: 'Week 1',
      }),
    ]);
  });

  it('copies the schedule so a later week still starts on its own date', async () => {
    groupRows = [handout({ due_date: '2026-08-30', available_on: '2026-08-23' })];

    await catchUpGroupAssignments(fakeClient(), ARGS);

    expect(inserted[0][0]).toMatchObject({
      due_date: '2026-08-30',
      available_on: '2026-08-23',
    });
  });

  it('takes one handout per deck, soonest deadline first', async () => {
    // Only one row per deck per group can exist; inserting both drifted copies
    // fails the whole batch and leaves the joiner with nothing.
    groupRows = [
      handout({ due_date: '2026-08-30', title: 'Week 1 retake' }),
      handout({ due_date: '2026-08-09' }),
    ];

    const count = await catchUpGroupAssignments(fakeClient(), ARGS);

    expect(count).toBe(1);
    expect(inserted[0][0]).toMatchObject({ deck_id: 'd1', due_date: '2026-08-09' });
  });

  it('skips a deck the joiner already holds even under a different title', async () => {
    groupRows = [handout(), handout({ member_id: 'newbie', title: 'Week 1 retake' })];

    const count = await catchUpGroupAssignments(fakeClient(), ARGS);

    expect(count).toBe(0);
    expect(inserted).toEqual([]);
  });

  it('does not duplicate a handout the joiner already has', async () => {
    groupRows = [handout(), handout({ member_id: 'newbie' })];

    const count = await catchUpGroupAssignments(fakeClient(), ARGS);

    expect(count).toBe(0);
    expect(inserted).toEqual([]);
  });

  it('writes nothing when the group has no open work', async () => {
    const count = await catchUpGroupAssignments(fakeClient(), ARGS);

    expect(count).toBe(0);
    expect(inserted).toEqual([]);
  });

  it('reports zero rather than throwing when the copy fails', async () => {
    groupRows = [handout()];
    insertError = { message: 'boom' };

    await expect(catchUpGroupAssignments(fakeClient(), ARGS)).resolves.toBe(0);
  });

  it('reports zero rather than throwing when the group cannot be read', async () => {
    readError = { message: 'boom' };

    await expect(catchUpGroupAssignments(fakeClient(), ARGS)).resolves.toBe(0);
  });
});
