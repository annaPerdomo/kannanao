import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { demoUuid } from '@/lib/demo/identity';

interface FilterCall {
  method: string;
  args: unknown[];
}

interface RecordedCall {
  table: string;
  op: string | null;
  args: unknown[];
  filters: FilterCall[];
}

const { calls, createUser, updateUserById, getUserById, listUsers, resetCalls, config } =
  vi.hoisted(() => {
    const calls: RecordedCall[] = [];
    const createUser = vi.fn(({ email }: { email: string }) =>
      Promise.resolve({ data: { user: { id: `auth-${email}` } }, error: null }),
    );
    const updateUserById = vi.fn(() => Promise.resolve({ error: null }));
    const getUserById = vi.fn((id: string) =>
      Promise.resolve({
        data: { user: { id, app_metadata: { demo: true } as Record<string, unknown> } },
        error: null,
      }),
    );
    const listUsers = vi.fn(() => Promise.resolve({ data: { users: [] }, error: null }));

    const config: {
      existingProfiles: Map<string, string>;
      authMarkers: Map<string, boolean>;
      groupCreatedAt: string | null;
      failTable: string | null;
      failOp: string | null;
    } = {
      existingProfiles: new Map(),
      authMarkers: new Map(),
      groupCreatedAt: null,
      failTable: null,
      failOp: null,
    };

    return {
      calls,
      createUser,
      updateUserById,
      getUserById,
      listUsers,
      resetCalls: () => calls.splice(0, calls.length),
      config,
    };
  });

function usernameFilter(entry: RecordedCall): string | undefined {
  const f = entry.filters.find((f) => f.method === 'eq' && f.args[0] === 'username');
  return f?.args[1] as string | undefined;
}

function makeBuilder(table: string) {
  const entry: RecordedCall = { table, op: null, args: [], filters: [] };
  calls.push(entry);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const builder: Record<string, any> = {};
  const chainMethods = ['eq', 'in', 'is', 'or', 'order', 'limit', 'single', 'maybeSingle'];
  for (const m of chainMethods) {
    builder[m] = (...args: unknown[]) => {
      entry.filters.push({ method: m, args });
      return builder;
    };
  }
  const opMethods = ['select', 'insert', 'update', 'upsert', 'delete'];
  for (const m of opMethods) {
    builder[m] = (...args: unknown[]) => {
      if (!entry.op) {
        entry.op = m;
        entry.args = args;
      } else {
        entry.filters.push({ method: m, args });
      }
      return builder;
    };
  }
  builder.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) => {
    const usedSingle = entry.filters.some(
      (f) => f.method === 'single' || f.method === 'maybeSingle',
    );

    if (table === config.failTable && entry.op === config.failOp) {
      return Promise.resolve({ data: null, error: { message: 'boom' } }).then(resolve, reject);
    }

    let response: { data: unknown; error: null };
    if (table === 'profiles' && entry.op === 'select') {
      const username = usernameFilter(entry);
      const id = username ? config.existingProfiles.get(username) : undefined;
      response = { data: id ? { id } : null, error: null };
    } else if (table === 'groups' && entry.op === 'select') {
      response = {
        data: config.groupCreatedAt ? { created_at: config.groupCreatedAt } : null,
        error: null,
      };
    } else if (table === 'groups' && entry.op === 'insert') {
      response = {
        data: usedSingle ? { id: 'demo-group-id' } : [{ id: 'demo-group-id' }],
        error: null,
      };
    } else if (entry.op === 'select' || entry.op === null) {
      response = { data: usedSingle ? null : [], error: null };
    } else {
      response = { data: null, error: null };
    }
    return Promise.resolve(response).then(resolve, reject);
  };
  return builder;
}

vi.mock('@/app/api/group/_lib/serviceSupabase', () => ({
  getServiceSupabase: () => ({
    from: (table: string) => makeBuilder(table),
    auth: { admin: { createUser, updateUserById, getUserById, listUsers } },
  }),
}));

import { GET } from '../route';

const SECRET = 'test-cron-secret';
const PASSWORD = 'demo-password-123';
const NOW = new Date('2026-10-23T10:00:00Z');

function request(authorization?: string) {
  return new NextRequest('https://tangodachi.app/api/cron/demo-reset', {
    headers: authorization ? { authorization } : {},
  });
}

describe('GET /api/cron/demo-reset', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetCalls();
    config.existingProfiles.clear();
    config.authMarkers.clear();
    config.groupCreatedAt = null;
    config.failTable = null;
    config.failOp = null;
    process.env.CRON_SECRET = SECRET;
    process.env.DEMO_PASSWORD = PASSWORD;
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });

  it('rejects a request with no authorization header, and never touches the client', async () => {
    const result = await GET(request());
    expect(result.status).toBe(401);
    expect(calls).toHaveLength(0);
    expect(createUser).not.toHaveBeenCalled();
  });

  it('rejects a wrong secret', async () => {
    const result = await GET(request('Bearer not-the-secret'));
    expect(result.status).toBe(401);
    expect(calls).toHaveLength(0);
  });

  it('500s and touches nothing when DEMO_PASSWORD is not set', async () => {
    delete process.env.DEMO_PASSWORD;
    const result = await GET(request(`Bearer ${SECRET}`));
    expect(result.status).toBe(500);
    expect(calls).toHaveLength(0);
    expect(createUser).not.toHaveBeenCalled();
  });

  describe('happy path', () => {
    it('runs end to end and returns learner/card/progress counts', async () => {
      const result = await GET(request(`Bearer ${SECRET}`));
      const json = await result.json();
      expect(result.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.learners).toBe(6);
      expect(json.cards).toBeGreaterThan(0);
    });

    it('filters every delete/update to a demo id, every in() non-empty', async () => {
      await GET(request(`Bearer ${SECRET}`));

      const mutating = calls.filter((c) => c.op === 'delete' || c.op === 'update');
      expect(mutating.length).toBeGreaterThan(0);
      for (const call of mutating) {
        const filterCall = call.filters.find(
          (f) => f.method === 'eq' || f.method === 'in' || f.method === 'or',
        );
        expect(filterCall, `${call.table}:${call.op} has no eq/in/or filter`).toBeTruthy();
        if (filterCall?.method === 'in') {
          expect(
            (filterCall.args[1] as unknown[]).length,
            `${call.table}:${call.op} has an empty in()`,
          ).toBeGreaterThan(0);
        }
      }
    });

    it('seeds every card_progress row with a demoUuid card id, count matching the seed', async () => {
      await GET(request(`Bearer ${SECRET}`));

      const progressInserts = calls.filter((c) => c.table === 'card_progress' && c.op === 'insert');
      const insertedRows = progressInserts.flatMap((c) => c.args[0] as Array<{ card_id: string }>);

      const { buildDemoSeed } = await import('@/lib/demo/seed');
      const seed = buildDemoSeed(NOW);
      const expectedCount = seed.learners.reduce((sum, l) => sum + l.progress.length, 0);

      expect(insertedRows).toHaveLength(expectedCount);
      const demoCardIds = new Set(seed.cards.map((c) => demoUuid(c.id)));
      for (const row of insertedRows) {
        expect(demoCardIds.has(row.card_id)).toBe(true);
      }
    });

    it('wipes before it inserts demo content', async () => {
      await GET(request(`Bearer ${SECRET}`));

      const deleteIndexes = calls.map((c, i) => (c.op === 'delete' ? i : -1)).filter((i) => i >= 0);
      const contentInsertTables = new Set([
        'groups',
        'decks',
        'cards',
        'deck_practice_sentences',
        'assignments',
        'card_progress',
        'study_sessions',
        'user_progress',
      ]);
      const contentInsertIndexes = calls
        .map((c, i) => (c.op === 'insert' && contentInsertTables.has(c.table) ? i : -1))
        .filter((i) => i >= 0);

      expect(deleteIndexes.length).toBeGreaterThan(0);
      expect(contentInsertIndexes.length).toBeGreaterThan(0);
      expect(Math.max(...deleteIndexes)).toBeLessThan(Math.min(...contentInsertIndexes));
    });
  });

  it('reuses existing accounts via updateUserById when profiles already exist', async () => {
    config.existingProfiles.set('demo-teacher', 'teacher-1');
    for (const key of ['maya', 'ken', 'sora', 'hana', 'leo', 'rin']) {
      config.existingProfiles.set(`demo-${key}`, `learner-${key}`);
    }

    const result = await GET(request(`Bearer ${SECRET}`));
    expect(result.status).toBe(200);
    expect(createUser).not.toHaveBeenCalled();
    expect(updateUserById).toHaveBeenCalledTimes(7);
  });

  it('throws and makes zero mutations when an existing auth user lacks the demo marker', async () => {
    config.existingProfiles.set('demo-teacher', 'teacher-1');
    getUserById.mockResolvedValueOnce({
      data: { user: { id: 'teacher-1', app_metadata: {} } },
      error: null,
    });

    const result = await GET(request(`Bearer ${SECRET}`));
    expect(result.status).toBe(500);
    expect(calls.some((c) => c.op === 'delete' || c.op === 'insert')).toBe(false);
  });

  it('stops before any insert when a wipe step errors', async () => {
    config.failTable = 'card_progress';
    config.failOp = 'delete';

    const result = await GET(request(`Bearer ${SECRET}`));
    expect(result.status).toBe(500);
    expect(calls.some((c) => c.op === 'insert')).toBe(false);
  });

  it('skips the run when the demo group was built in the last 5 minutes', async () => {
    config.groupCreatedAt = new Date(NOW.getTime() - 60_000).toISOString();

    const result = await GET(request(`Bearer ${SECRET}`));
    const json = await result.json();
    expect(result.status).toBe(200);
    expect(json.skipped).toBe('recent');
    expect(calls.some((c) => c.op === 'delete' || c.op === 'insert')).toBe(false);
  });
});
