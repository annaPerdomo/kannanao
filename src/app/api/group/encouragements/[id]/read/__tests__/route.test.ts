import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { _resetStore } from '@/app/api/_lib/rateLimit';
import { DataError } from '@/lib/dataError';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const { getUserFromTokenMock, getUserFromTokenResultMock } = vi.hoisted(() => ({
  getUserFromTokenMock: vi.fn(),
  getUserFromTokenResultMock: vi.fn(),
}));

vi.mock('@/app/api/_lib/authCache', () => ({
  getUserFromToken: (...args: unknown[]) => getUserFromTokenMock(...args),
  getUserFromTokenResult: (...args: unknown[]) => getUserFromTokenResultMock(...args),
  _resetAuthCache: vi.fn(),
}));

const tableData: Record<string, { data: unknown; error: unknown }> = {};
function setTable(table: string, data: unknown, error: unknown = null) {
  tableData[table] = { data, error };
}

function makeChain(table: string) {
  const result = () => tableData[table] ?? { data: null, error: null };
  const chain: Record<string, unknown> = {};
  ['update', 'eq', 'is'].forEach((m) => {
    chain[m] = vi.fn(() => chain);
  });
  chain.then = (onful: (v: unknown) => unknown, onrej?: (e: unknown) => unknown) =>
    Promise.resolve(result()).then(onful, onrej);
  return chain;
}

vi.mock('@/app/api/group/_lib/serviceSupabase', () => ({
  getServiceSupabase: () => ({ from: (table: string) => makeChain(table) }),
}));

const { PATCH } = await import('@/app/api/group/encouragements/[id]/read/route');

// ─── Helpers ─────────────────────────────────────────────────────────────────

const USER = { id: 'user-1' };

function makeRequest(withAuth = true) {
  return new NextRequest('http://localhost/api/group/encouragements/enc-1/read', {
    method: 'PATCH',
    headers: withAuth ? { authorization: 'Bearer tok' } : {},
  });
}

function params(id = 'enc-1') {
  return { params: Promise.resolve({ id }) };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('PATCH /api/group/encouragements/[id]/read', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetStore();
    for (const k of Object.keys(tableData)) delete tableData[k];
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    getUserFromTokenMock.mockResolvedValue(USER);
    getUserFromTokenResultMock.mockImplementation(async (...args: unknown[]) => ({
      value: await getUserFromTokenMock(...args),
      error: null,
    }));
    setTable('encouragements', { error: null });
  });

  it('returns 401 without an auth header', async () => {
    const res = await PATCH(makeRequest(false), params());
    expect(res.status).toBe(401);
  });

  it('returns 401 for an invalid token', async () => {
    getUserFromTokenMock.mockResolvedValue(null);
    const res = await PATCH(makeRequest(), params());
    expect(res.status).toBe(401);
  });

  it('marks the encouragement read', async () => {
    const res = await PATCH(makeRequest(), params());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
  });

  it('returns 500 when the update fails', async () => {
    setTable('encouragements', null, { message: 'boom' });
    const res = await PATCH(makeRequest(), params());
    expect(res.status).toBe(500);
  });

  it('returns 503 when the auth service itself is unreachable', async () => {
    getUserFromTokenResultMock.mockResolvedValue({
      value: null,
      error: new DataError('upstream', 'gateway down'),
    });
    const res = await PATCH(makeRequest(), params());
    expect(res.status).toBe(503);
  });
});
