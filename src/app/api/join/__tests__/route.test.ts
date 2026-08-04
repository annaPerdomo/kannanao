import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { _resetStore } from '@/app/api/_lib/rateLimit';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const tableData: Record<string, { data: unknown; error: unknown }> = {};
function setTable(table: string, data: unknown, error: unknown = null) {
  tableData[table] = { data, error };
}

const calls: { table: string; method: string; args: unknown[] }[] = [];
const deletedUsers: string[] = [];

function makeChain(table: string) {
  const filters: [string, unknown][] = [];
  const result = () => {
    const { data, error } = tableData[table] ?? { data: [], error: null };
    if (!Array.isArray(data)) return { data, error };
    const rows = data.filter((row) =>
      filters.every(([col, value]) => (row as Record<string, unknown>)[col] === value),
    );
    return { data: rows, error };
  };
  const chain: Record<string, unknown> = {};
  ['select', 'or', 'order', 'limit', 'update', 'insert', 'upsert', 'delete'].forEach((m) => {
    chain[m] = vi.fn((...args: unknown[]) => {
      calls.push({ table, method: m, args });
      return chain;
    });
  });
  chain.eq = vi.fn((...args: unknown[]) => {
    calls.push({ table, method: 'eq', args });
    filters.push([args[0] as string, args[1]]);
    return chain;
  });
  const first = () => {
    const { data, error } = result();
    return Promise.resolve({ data: Array.isArray(data) ? (data[0] ?? null) : data, error });
  };
  chain.single = vi.fn(first);
  chain.maybeSingle = vi.fn(first);
  chain.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result()).then(resolve);
  return chain;
}

vi.mock('@/app/api/group/_lib/serviceSupabase', () => ({
  getServiceSupabase: () => ({
    from: (table: string) => makeChain(table),
    auth: {
      admin: {
        createUser: vi.fn(async () => ({ data: { user: { id: 'newbie' } }, error: null })),
        deleteUser: vi.fn(async (id: string) => {
          deletedUsers.push(id);
          return { error: null };
        }),
      },
    },
  }),
}));

// No auto-sign-in: the session is not what these tests are about.
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: { signInWithPassword: async () => ({ data: { session: null }, error: null }) },
  }),
}));

const { POST } = await import('@/app/api/join/route');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest() {
  return new NextRequest('http://localhost/api/join', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.0.0.7' },
    body: JSON.stringify({ code: 'ABC123', username: 'newbie', password: 'hunter2' }),
  });
}

const INVITE = {
  id: 'inv1',
  code: 'ABC123',
  organizer_id: 'org1',
  group_id: 'g1',
  max_uses: null,
  times_used: 0,
  expires_at: null,
};

beforeEach(() => {
  _resetStore();
  vi.clearAllMocks();
  calls.length = 0;
  deletedUsers.length = 0;
  for (const k of Object.keys(tableData)) delete tableData[k];
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
  setTable('invite_codes', [INVITE]);
  setTable('profiles', []);
  setTable('group_members', []);
  setTable('assignments', []);
  setTable('decks', []);
  setTable('deck_shares', []);
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('POST /api/join', () => {
  it('records the membership as well as the profile pointer', async () => {
    const res = await POST(makeRequest());

    expect(res.status).toBe(201);
    const upsert = calls.find((c) => c.table === 'group_members' && c.method === 'upsert');
    expect(upsert?.args[0]).toMatchObject({
      member_id: 'newbie',
      group_id: 'g1',
      organizer_id: 'org1',
    });
  });

  it('fails the join when the membership cannot be written', async () => {
    // Every roster reads group_members, so an account created without one is
    // signed in and belongs to nobody — invisible to the organizer, with no
    // assignments and no way to notice. Undo it instead.
    setTable('group_members', null, { message: 'boom' });

    const res = await POST(makeRequest());

    expect(res.status).toBe(500);
    expect(deletedUsers).toEqual(['newbie']);
    expect(calls.some((c) => c.table === 'profiles' && c.method === 'delete')).toBe(true);
    // The invite use is handed back: claimed once, released once.
    expect(calls.filter((c) => c.table === 'invite_codes' && c.method === 'update')).toHaveLength(
      2,
    );
  });
});
