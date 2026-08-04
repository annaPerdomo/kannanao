import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { _resetStore } from '@/app/api/_lib/rateLimit';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const { getUserFromTokenMock, getProfileForUserMock } = vi.hoisted(() => ({
  getUserFromTokenMock: vi.fn(),
  getProfileForUserMock: vi.fn(),
}));

vi.mock('@/app/api/_lib/authCache', () => ({
  getUserFromToken: (...args: unknown[]) => getUserFromTokenMock(...args),
  getProfileForUser: (...args: unknown[]) => getProfileForUserMock(...args),
  _resetAuthCache: vi.fn(),
}));

const tableData: Record<string, { data: unknown; error: unknown }> = {};
function setTable(table: string, data: unknown, error: unknown = null) {
  tableData[table] = { data, error };
}

/** ids the roster query asked profiles for, so tests can assert who is on it. */
const rosterIds: string[][] = [];

function makeChain(table: string) {
  const result = () => tableData[table] ?? { data: [], error: null };
  const chain: Record<string, unknown> = {};
  ['select', 'eq', 'gte', 'or', 'order', 'limit'].forEach((m) => {
    chain[m] = vi.fn(() => chain);
  });
  chain.in = vi.fn((_col: string, ids: string[]) => {
    if (table === 'profiles') rosterIds.push([...ids].sort());
    return chain;
  });
  chain.single = vi.fn(() => {
    const { data, error } = result();
    return Promise.resolve({ data: Array.isArray(data) ? (data[0] ?? null) : data, error });
  });
  chain.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result()).then(resolve);
  return chain;
}

vi.mock('@/app/api/group/_lib/serviceSupabase', () => ({
  getServiceSupabase: () => ({ from: (table: string) => makeChain(table) }),
}));

const { GET } = await import('@/app/api/group/leaderboard/route');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(query = '') {
  return new NextRequest(`http://localhost/api/group/leaderboard${query}`, {
    headers: { authorization: 'Bearer tok', 'x-forwarded-for': '10.0.0.2' },
  });
}

beforeEach(() => {
  _resetStore();
  vi.clearAllMocks();
  rosterIds.length = 0;
  for (const k of Object.keys(tableData)) delete tableData[k];
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
  getUserFromTokenMock.mockResolvedValue({ id: 'user1' });
  getProfileForUserMock.mockResolvedValue({
    id: 'user1',
    organizer_id: 'org1',
    group_id: 'g1',
    account_type: 'member',
  });
  setTable('groups', [{ id: 'g1', organizer_id: 'org1', show_leaderboard: true }]);
  setTable('group_members', [{ group_id: 'g1', member_id: 'user1', organizer_id: 'org1' }]);
  setTable('profiles', [{ id: 'user1', username: 'kenji', display_name: 'Kenji', avatar: null }]);
  setTable('study_sessions', []);
  setTable('user_progress', []);
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('GET /api/group/leaderboard', () => {
  it('returns 401 without an auth header', async () => {
    const res = await GET(new NextRequest('http://localhost/api/group/leaderboard'));
    expect(res.status).toBe(401);
  });

  it('ranks the caller’s own group by weekly XP', async () => {
    setTable('group_members', [
      { group_id: 'g1', member_id: 'user1', organizer_id: 'org1' },
      { group_id: 'g1', member_id: 'user2', organizer_id: 'org1' },
    ]);
    setTable('profiles', [
      { id: 'user1', username: 'kenji', display_name: 'Kenji', avatar: null },
      { id: 'user2', username: 'aya', display_name: 'Aya', avatar: null },
    ]);
    setTable('study_sessions', [
      { user_id: 'user1', xp_earned: 10, cards_studied: 3 },
      { user_id: 'user2', xp_earned: 40, cards_studied: 9 },
    ]);

    const res = await GET(makeRequest());

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.map((r: { id: string }) => r.id)).toEqual(['user2', 'user1']);
    expect(json[0].weeklyXp).toBe(40);
  });

  it('lets an organizer read a group they run', async () => {
    getProfileForUserMock.mockResolvedValue({ id: 'org1', organizer_id: null, group_id: null });
    setTable('group_members', [{ group_id: 'g1', member_id: 'user1', organizer_id: 'org1' }]);

    const res = await GET(makeRequest('?groupId=g1'));

    expect(res.status).toBe(200);
    // The group's learners plus the organizer, who ranks on their own board.
    expect(rosterIds[0]).toEqual(['org1', 'user1']);
  });

  it('lets a learner read the group they are in', async () => {
    const res = await GET(makeRequest('?groupId=g1'));
    expect(res.status).toBe(200);
  });

  it('refuses a groupId the caller neither runs nor learns in', async () => {
    // A learner who switched groups still knows their old group's id, and the
    // roster below is derived from whichever organizer the id resolves to.
    getProfileForUserMock.mockResolvedValue({
      id: 'user1',
      organizer_id: 'org2',
      group_id: 'g2',
      account_type: 'member',
    });
    setTable('groups', [{ id: 'g1', organizer_id: 'org1', show_leaderboard: true }]);
    setTable('group_members', [{ group_id: 'g2', member_id: 'user1', organizer_id: 'org2' }]);

    const res = await GET(makeRequest('?groupId=g1'));

    expect(res.status).toBe(403);
    expect(rosterIds).toEqual([]);
  });

  it('404s an unknown groupId', async () => {
    setTable('groups', []);

    const res = await GET(makeRequest('?groupId=nope'));

    expect(res.status).toBe(404);
  });

  it('returns an empty board when the group hides its leaderboard', async () => {
    setTable('groups', [{ id: 'g1', organizer_id: 'org1', show_leaderboard: false }]);

    const res = await GET(makeRequest());

    expect(await res.json()).toEqual([]);
  });
});
