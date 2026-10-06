import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  checkDateOrder,
  handoutPatchToDbUpdates,
  parseHandoutPatch,
  removeHandout,
  updateHandout,
} from '../handoutWrites';

// ─── parseHandoutPatch ──────────────────────────────────────────────────────

describe('parseHandoutPatch', () => {
  it('parses a full valid patch', () => {
    const result = parseHandoutPatch({
      title: '  Week 1  ',
      note: '  Learn greetings  ',
      dueDate: '2026-10-20',
      availableOn: '2026-10-13',
      requiredAccuracy: 80,
      requiredMode: 'study',
    });
    expect(result).toEqual({
      patch: {
        title: 'Week 1',
        note: 'Learn greetings',
        dueDate: '2026-10-20',
        availableOn: '2026-10-13',
        requiredAccuracy: 80,
        requiredMode: 'study',
      },
    });
  });

  it('rejects a non-object body', () => {
    expect(parseHandoutPatch(null)).toEqual({ error: 'Invalid request body.' });
    expect(parseHandoutPatch('x')).toEqual({ error: 'Invalid request body.' });
  });

  it('rejects an availableOn not matching YYYY-MM-DD', () => {
    expect(parseHandoutPatch({ availableOn: '10/20/2026' })).toEqual({
      error: 'Invalid availableOn.',
    });
  });

  it('rejects an unparsable dueDate', () => {
    expect(parseHandoutPatch({ dueDate: 'not-a-date' })).toEqual({ error: 'Invalid dueDate.' });
  });

  it('allows availableOn after dueDate — this parser never checked order (matches the old PATCH /api/group/assignments/[id] behavior)', () => {
    const result = parseHandoutPatch({ availableOn: '2026-10-20', dueDate: '2026-10-13' });
    expect('error' in result).toBe(false);
  });

  it('rejects an out-of-range requiredAccuracy', () => {
    expect(parseHandoutPatch({ requiredAccuracy: 150 })).toEqual({
      error: 'requiredAccuracy must be an integer between 0 and 100.',
    });
    expect(parseHandoutPatch({ requiredAccuracy: 1.5 })).toEqual({
      error: 'requiredAccuracy must be an integer between 0 and 100.',
    });
  });

  it('rejects an invalid requiredMode', () => {
    expect(parseHandoutPatch({ requiredMode: 'not-a-mode' })).toEqual({
      error: 'requiredMode is not a valid goal mode.',
    });
  });

  it('coerces empty/blank strings and non-strings to null', () => {
    expect(parseHandoutPatch({ title: '   ', note: 42 })).toEqual({
      patch: { title: null, note: null },
    });
  });
});

describe('checkDateOrder', () => {
  it('rejects availableOn after dueDate', () => {
    expect(checkDateOrder({ availableOn: '2026-10-20', dueDate: '2026-10-13' })).toEqual({
      error: 'availableOn must be on or before dueDate.',
    });
  });

  it('allows availableOn equal to dueDate', () => {
    expect(checkDateOrder({ availableOn: '2026-10-13', dueDate: '2026-10-13' })).toBeNull();
  });

  it('allows when only one of the two is set', () => {
    expect(checkDateOrder({ dueDate: '2026-10-13' })).toBeNull();
    expect(checkDateOrder({ availableOn: '2026-10-13' })).toBeNull();
  });
});

describe('handoutPatchToDbUpdates', () => {
  it('only maps keys present in the patch', () => {
    expect(handoutPatchToDbUpdates({ title: 'X' })).toEqual({ title: 'X' });
    expect(handoutPatchToDbUpdates({ dueDate: '2026-10-20', availableOn: null })).toEqual({
      due_date: '2026-10-20',
      available_on: null,
    });
    expect(handoutPatchToDbUpdates({})).toEqual({});
  });
});

// ─── updateHandout / removeHandout ──────────────────────────────────────────

function makeChain(onCall: (table: string, method: string, args: unknown[]) => void) {
  const chain: Record<string, unknown> = {};
  ['select', 'eq', 'in'].forEach((m) => {
    chain[m] = vi.fn((...args: unknown[]) => {
      onCall('', m, args);
      return chain;
    });
  });
  chain.update = vi.fn((...args: unknown[]) => {
    onCall('', 'update', args);
    return chain;
  });
  chain.delete = vi.fn((...args: unknown[]) => {
    onCall('', 'delete', args);
    return chain;
  });
  return chain;
}

describe('updateHandout', () => {
  let calls: { table: string; method: string; args: unknown[] }[];
  let results: Record<string, { error: { message: string } | null }>;

  function makeSb() {
    return {
      from: vi.fn((table: string) => {
        const chain = makeChain((_t, method, args) => calls.push({ table, method, args }));
        chain.then = (onfulfilled: (v: unknown) => unknown) =>
          Promise.resolve(results[table] ?? { error: null }).then(onfulfilled);
        return chain;
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  }

  beforeEach(() => {
    calls = [];
    results = {};
  });

  it('writes both assignments and planned_assignments', async () => {
    const sb = makeSb();
    const { error } = await updateHandout(sb, {
      organizerId: 'org1',
      groupId: 'g1',
      deckId: 'd1',
      patch: { title: 'Week 1', dueDate: '2026-10-20' },
    });
    expect(error).toBeNull();
    const updateCalls = calls.filter((c) => c.method === 'update');
    expect(updateCalls).toHaveLength(2);
    expect(updateCalls[0].args[0]).toEqual({ title: 'Week 1', due_date: '2026-10-20' });
    expect(updateCalls[1].args[0]).toEqual({ title: 'Week 1', due_date: '2026-10-20' });
  });

  it('never sends completed_at or progress_accuracy', async () => {
    const sb = makeSb();
    await updateHandout(sb, {
      organizerId: 'org1',
      groupId: 'g1',
      deckId: 'd1',
      patch: { note: 'hi' },
    });
    for (const call of calls.filter((c) => c.method === 'update')) {
      const updates = call.args[0] as Record<string, unknown>;
      expect(updates).not.toHaveProperty('completed_at');
      expect(updates).not.toHaveProperty('progress_accuracy');
    }
  });

  it('skips the writes entirely for an empty patch', async () => {
    const sb = makeSb();
    const { error } = await updateHandout(sb, {
      organizerId: 'org1',
      groupId: 'g1',
      deckId: 'd1',
      patch: {},
    });
    expect(error).toBeNull();
    expect(calls.filter((c) => c.method === 'update')).toHaveLength(0);
  });

  it('surfaces a db error', async () => {
    results.assignments = { error: { message: 'boom' } };
    const sb = makeSb();
    const { error } = await updateHandout(sb, {
      organizerId: 'org1',
      groupId: 'g1',
      deckId: 'd1',
      patch: { note: 'hi' },
    });
    expect(error).toBe('boom');
  });
});

describe('removeHandout', () => {
  let calls: { table: string; method: string; args: unknown[] }[];
  let results: Record<string, { data?: unknown; error: { message: string } | null }>;

  function makeSb() {
    return {
      from: vi.fn((table: string) => {
        const chain = makeChain((_t, method, args) => calls.push({ table, method, args }));
        chain.then = (onfulfilled: (v: unknown) => unknown) =>
          Promise.resolve(results[table] ?? { data: [], error: null }).then(onfulfilled);
        return chain;
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  }

  beforeEach(() => {
    calls = [];
    results = { lesson_plans: { data: [{ id: 'plan1' }], error: null } };
  });

  it('deletes assignments, the template, and the plan-deck link, never decks/cards', async () => {
    const sb = makeSb();
    const { error } = await removeHandout(sb, { organizerId: 'org1', groupId: 'g1', deckId: 'd1' });
    expect(error).toBeNull();

    const tablesTouched = calls.filter((c) => c.method === 'delete').map((c) => c.table);
    expect(tablesTouched).toEqual(
      expect.arrayContaining(['assignments', 'planned_assignments', 'lesson_plan_decks']),
    );
    expect(tablesTouched).not.toContain('decks');
    expect(tablesTouched).not.toContain('cards');
  });

  it('skips the lesson_plan_decks delete when the organizer has no plans in this group', async () => {
    results.lesson_plans = { data: [], error: null };
    const sb = makeSb();
    await removeHandout(sb, { organizerId: 'org1', groupId: 'g1', deckId: 'd1' });
    const tablesTouched = calls.filter((c) => c.method === 'delete').map((c) => c.table);
    expect(tablesTouched).not.toContain('lesson_plan_decks');
  });

  it('surfaces a db error from the assignments delete', async () => {
    results.assignments = { error: { message: 'boom' } };
    const sb = makeSb();
    const { error } = await removeHandout(sb, { organizerId: 'org1', groupId: 'g1', deckId: 'd1' });
    expect(error).toBe('boom');
  });
});
