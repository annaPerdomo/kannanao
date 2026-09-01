import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { _resetStore } from '@/app/api/_lib/rateLimit';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const { requireOrganizerAccountMock, getUserFromTokenMock, getProfileForUserMock } = vi.hoisted(
  () => ({
    requireOrganizerAccountMock: vi.fn(),
    getUserFromTokenMock: vi.fn(),
    getProfileForUserMock: vi.fn(),
  }),
);

vi.mock('@/app/api/_lib/requireOrganizerAccount', () => ({
  requireOrganizerAccount: (...args: unknown[]) => requireOrganizerAccountMock(...args),
}));

vi.mock('@/app/api/_lib/authCache', () => ({
  getUserFromToken: (...args: unknown[]) => getUserFromTokenMock(...args),
  getProfileForUser: (...args: unknown[]) => getProfileForUserMock(...args),
  getUserFromTokenResult: async (...args: unknown[]) => ({
    value: await getUserFromTokenMock(...args),
    error: null,
  }),
  getProfileForUserResult: async (...args: unknown[]) => ({
    value: await getProfileForUserMock(...args),
    error: null,
  }),
  _resetAuthCache: vi.fn(),
}));

const tableData: Record<string, { data: unknown; error: unknown }> = {};
function setTable(table: string, data: unknown, error: unknown = null) {
  tableData[table] = { data, error };
}

const upsertMock = vi.fn();
const insertMock = vi.fn();
const updateMock = vi.fn();
const eqCalls: { table: string; args: unknown[] }[] = [];
const inCalls: { table: string; args: unknown[] }[] = [];

function makeChain(table: string) {
  const result = () => tableData[table] ?? { data: null, error: null };
  const chain: Record<string, unknown> = {};
  ['select', 'order', 'limit', 'or', 'not'].forEach((m) => {
    chain[m] = vi.fn(() => chain);
  });
  chain.insert = vi.fn((...args: unknown[]) => {
    insertMock(table, ...args);
    return chain;
  });
  chain.update = vi.fn((...args: unknown[]) => {
    updateMock(table, ...args);
    return chain;
  });
  chain.eq = vi.fn((...args: unknown[]) => {
    eqCalls.push({ table, args });
    return chain;
  });
  chain.in = vi.fn((...args: unknown[]) => {
    inCalls.push({ table, args });
    return chain;
  });
  chain.upsert = vi.fn((...args: unknown[]) => {
    upsertMock(table, ...args);
    return chain;
  });
  chain.single = vi.fn(() => Promise.resolve(result()));
  chain.then = (onfulfilled: (v: unknown) => unknown, onrejected?: (e: unknown) => unknown) =>
    Promise.resolve(result()).then(onfulfilled, onrejected);
  return chain;
}

const fromMock = vi.fn((table: string) => makeChain(table));

vi.mock('@/app/api/group/_lib/serviceSupabase', () => ({
  getServiceSupabase: () => ({ from: fromMock }),
}));

import { GET, POST } from '@/app/api/group/assignments/route';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ORGANIZER = { id: 'org-1', username: 'teacher', account_type: 'organizer' };

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/group/assignments', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer tok' },
    body: JSON.stringify(body),
  });
}

function makeGetRequest(withAuth = true, query = '') {
  return new NextRequest(`http://localhost/api/group/assignments${query}`, {
    method: 'GET',
    headers: withAuth ? { authorization: 'Bearer tok' } : {},
  });
}

const BASE_BODY = { memberIds: ['m1'], deckId: 'deck-1' };

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('POST /api/group/assignments (mastery goals)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetStore();
    for (const k of Object.keys(tableData)) delete tableData[k];
    requireOrganizerAccountMock.mockResolvedValue(ORGANIZER);
    setTable('groups', { id: 'g1' });
    setTable('group_members', [{ member_id: 'm1' }]);
    setTable('assignments', [{ id: 'a1' }]);
  });

  it('returns 403 when the requester is not an organizer', async () => {
    requireOrganizerAccountMock.mockResolvedValue(
      NextResponse.json({ error: 'Organizers only.' }, { status: 403 }),
    );
    const res = await POST(makeRequest(BASE_BODY));
    expect(res.status).toBe(403);
  });

  it('creates rows with null goal columns when no goal is sent', async () => {
    const res = await POST(makeRequest(BASE_BODY));
    expect(res.status).toBe(201);
    const rows = upsertMock.mock.calls[0][1] as Record<string, unknown>[];
    expect(rows[0].required_accuracy).toBeNull();
    expect(rows[0].required_mode).toBeNull();
  });

  it('passes a valid goal through to the inserted rows', async () => {
    const res = await POST(
      makeRequest({ ...BASE_BODY, requiredAccuracy: 80, requiredMode: 'match' }),
    );
    expect(res.status).toBe(201);
    const rows = upsertMock.mock.calls[0][1] as Record<string, unknown>[];
    expect(rows[0].required_accuracy).toBe(80);
    expect(rows[0].required_mode).toBe('match');
  });

  it.each([150, -1, 79.5, '80'])('rejects invalid requiredAccuracy %p', async (value) => {
    const res = await POST(makeRequest({ ...BASE_BODY, requiredAccuracy: value }));
    expect(res.status).toBe(400);
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it.each(['speech_read', 'word-match', 'not-a-mode', 42])(
    'rejects requiredMode %p (not a deck-tied goal mode)',
    async (value) => {
      const res = await POST(makeRequest({ ...BASE_BODY, requiredMode: value }));
      expect(res.status).toBe(400);
      expect(upsertMock).not.toHaveBeenCalled();
    },
  );
});

describe('POST /api/group/assignments (kana goals)', () => {
  const KANA_BODY = { memberIds: ['m1'], kanaSet: 'hira-ka' };

  beforeEach(() => {
    vi.clearAllMocks();
    _resetStore();
    for (const k of Object.keys(tableData)) delete tableData[k];
    requireOrganizerAccountMock.mockResolvedValue(ORGANIZER);
    setTable('groups', { id: 'g1' });
    setTable('group_members', [{ member_id: 'm1' }]);
    setTable('assignments', []);
  });

  it('inserts a kana row with a null deck_id', async () => {
    const res = await POST(makeRequest(KANA_BODY));
    expect(res.status).toBe(201);
    const rows = insertMock.mock.calls[0][1] as Record<string, unknown>[];
    expect(rows[0]).toMatchObject({ kana_set: 'hira-ka', deck_id: null, member_id: 'm1' });
    // The deck upsert must not be the path a kana row takes: its ON CONFLICT
    // target cannot infer the partial unique index.
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it('updates the existing row instead of inserting a duplicate', async () => {
    setTable('assignments', [{ member_id: 'm1' }]);
    const res = await POST(makeRequest({ ...KANA_BODY, dueDate: '2026-09-30' }));
    expect(res.status).toBe(201);
    expect(insertMock).not.toHaveBeenCalled();
    expect(updateMock.mock.calls[0][1]).toMatchObject({ due_date: '2026-09-30' });
  });

  it.each([
    [{ memberIds: ['m1'] }, 'neither a deck nor a kana row'],
    [{ memberIds: ['m1'], deckId: 'deck-1', kanaSet: 'hira-ka' }, 'both at once'],
  ])('rejects %j — %s', async (body, _label) => {
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(400);
    expect(insertMock).not.toHaveBeenCalled();
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it.each(['hira-nope', 'hira_ka', '', 42])('rejects kanaSet %p', async (value) => {
    const res = await POST(makeRequest({ memberIds: ['m1'], kanaSet: value }));
    expect(res.status).toBe(400);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('rejects a requiredMode on a kana goal', async () => {
    const res = await POST(makeRequest({ ...KANA_BODY, requiredMode: 'match' }));
    expect(res.status).toBe(400);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('accepts an accuracy goal on a kana row', async () => {
    const res = await POST(makeRequest({ ...KANA_BODY, requiredAccuracy: 90 }));
    expect(res.status).toBe(201);
    const rows = insertMock.mock.calls[0][1] as Record<string, unknown>[];
    expect(rows[0].required_accuracy).toBe(90);
  });
});

describe('GET /api/group/assignments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetStore();
    for (const k of Object.keys(tableData)) delete tableData[k];
    eqCalls.length = 0;
    inCalls.length = 0;
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    getUserFromTokenMock.mockResolvedValue({ id: 'user-1' });
  });

  it('returns 401 without an auth header', async () => {
    const res = await GET(makeGetRequest(false));
    expect(res.status).toBe(401);
  });

  it('returns 401 for an invalid token', async () => {
    getUserFromTokenMock.mockResolvedValue(null);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(401);
  });

  it('lists assignments for an organizer', async () => {
    getProfileForUserMock.mockResolvedValue({ account_type: 'organizer' });
    setTable('assignments', [{ id: 'a1', required_accuracy: 80, required_mode: 'match' }]);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json[0].required_accuracy).toBe(80);
  });

  it('lists assignments for a member', async () => {
    getProfileForUserMock.mockResolvedValue({ account_type: 'member' });
    setTable('assignments', [{ id: 'a1' }]);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    expect(await res.json()).toHaveLength(1);
  });

  it('returns 500 when the query fails', async () => {
    getProfileForUserMock.mockResolvedValue({ account_type: 'organizer' });
    setTable('assignments', null, { message: 'boom' });
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(500);
  });

  it('scopes a learner’s own list to the organizers whose groups they are in', async () => {
    getProfileForUserMock.mockResolvedValue({ account_type: 'member', organizer_id: 'org-2' });
    setTable('group_members', [
      { group_id: 'g1', organizer_id: 'org-2' },
      { group_id: 'g9', organizer_id: 'org-3' },
    ]);
    setTable('assignments', []);

    await GET(makeGetRequest(true, '?scope=mine'));

    const assignmentEqs = eqCalls.filter((c) => c.table === 'assignments').map((c) => c.args);
    expect(assignmentEqs).toContainEqual(['member_id', 'user-1']);
    // Both groups: an advanced group and a business Japanese group each set
    // homework, and neither may hide the other. A former organizer, whose
    // membership row is gone, drops off the list.
    const assignmentIns = inCalls.filter((c) => c.table === 'assignments').map((c) => c.args);
    expect(assignmentIns).toContainEqual(['organizer_id', ['org-2', 'org-3']]);
  });

  it('does not scope by organizer when the account is in no group', async () => {
    getProfileForUserMock.mockResolvedValue({ account_type: 'member', organizer_id: null });
    setTable('group_members', []);
    setTable('assignments', []);

    await GET(makeGetRequest(true, '?scope=mine'));

    const assignmentEqs = eqCalls.filter((c) => c.table === 'assignments').map((c) => c.args);
    expect(assignmentEqs).toEqual([['member_id', 'user-1']]);
    expect(inCalls.filter((c) => c.table === 'assignments')).toEqual([]);
  });
});
