import { beforeEach, describe, expect, it, vi } from 'vitest';

const selectResults: Record<string, { data: unknown; error: unknown }> = {};
const upsertResults: Record<string, { data: unknown; error: unknown }> = {};
const upserts: { table: string; rows: unknown; options: unknown }[] = [];

function makeChain(table: string) {
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    maybeSingle: () => Promise.resolve(selectResults[table] ?? { data: null, error: null }),
    upsert: (rows: unknown, options: unknown) => {
      upserts.push({ table, rows, options });
      return Promise.resolve(upsertResults[table] ?? { data: null, error: null });
    },
  };
  return chain;
}

vi.mock('../../../_lib/serviceSupabase', () => ({
  getServiceSupabase: () => ({ from: (table: string) => makeChain(table) }),
}));

const warnSpy = vi.fn();
vi.mock('@/lib/logger', () => ({
  logger: { warn: (...args: unknown[]) => warnSpy(...args), error: vi.fn(), info: vi.fn() },
}));

import { saveLessonPlanDecks, saveLessonPlanRow } from '../saveLessonUnit';

const ARGS = { planId: 'p1', organizerId: 'org1', groupId: 'g1', title: 'Food' };

beforeEach(() => {
  for (const key of Object.keys(selectResults)) delete selectResults[key];
  for (const key of Object.keys(upsertResults)) delete upsertResults[key];
  upserts.length = 0;
  warnSpy.mockClear();
  selectResults.lesson_plans = { data: { organizer_id: 'org1', group_id: 'g1' }, error: null };
});

describe('saveLessonPlanRow', () => {
  it('upserts with ignoreDuplicates and returns true on a matching row', async () => {
    const ok = await saveLessonPlanRow(ARGS);
    expect(ok).toBe(true);
    expect(upserts[0]).toMatchObject({
      table: 'lesson_plans',
      options: { onConflict: 'id', ignoreDuplicates: true },
    });
  });

  it('returns false and warns when the row belongs to another organizer', async () => {
    selectResults.lesson_plans = {
      data: { organizer_id: 'someone-else', group_id: 'g1' },
      error: null,
    };
    const ok = await saveLessonPlanRow(ARGS);
    expect(ok).toBe(false);
    expect(warnSpy).toHaveBeenCalled();
  });

  it('returns false and warns when the row belongs to another group', async () => {
    selectResults.lesson_plans = {
      data: { organizer_id: 'org1', group_id: 'someone-elses-group' },
      error: null,
    };
    const ok = await saveLessonPlanRow(ARGS);
    expect(ok).toBe(false);
    expect(warnSpy).toHaveBeenCalled();
  });

  it('returns false when the upsert errors', async () => {
    upsertResults.lesson_plans = { data: null, error: { message: 'boom' } };
    const ok = await saveLessonPlanRow(ARGS);
    expect(ok).toBe(false);
  });

  it('returns false when the ownership select fails', async () => {
    selectResults.lesson_plans = { data: null, error: { message: 'nope' } };
    const ok = await saveLessonPlanRow(ARGS);
    expect(ok).toBe(false);
  });
});

describe('saveLessonPlanDecks', () => {
  it('upserts a row per result that has a deckId, created and resumed alike', async () => {
    await saveLessonPlanDecks({
      planId: 'p1',
      results: [
        { name: 'Food', deckId: 'd1', status: 'created' },
        { name: 'Counting', deckId: 'd2', status: 'created' },
        { name: 'Failed deck', status: 'failed' },
      ],
    });
    const call = upserts.find((u) => u.table === 'lesson_plan_decks');
    expect(call?.rows).toEqual([
      { plan_id: 'p1', deck_id: 'd1', position: 0 },
      { plan_id: 'p1', deck_id: 'd2', position: 1 },
    ]);
  });

  it('writes nothing when no result has a deckId', async () => {
    await saveLessonPlanDecks({ planId: 'p1', results: [{ name: 'Food', status: 'failed' }] });
    expect(upserts.find((u) => u.table === 'lesson_plan_decks')).toBeUndefined();
  });
});
