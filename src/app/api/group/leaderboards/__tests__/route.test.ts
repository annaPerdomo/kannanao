import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { _resetStore } from '@/app/api/_lib/rateLimit';

const { requireAuthenticatedUserMock, buildLeaderboardsMock } = vi.hoisted(() => ({
  requireAuthenticatedUserMock: vi.fn(),
  buildLeaderboardsMock: vi.fn(),
}));

vi.mock('@/app/api/_lib/requireAuthenticatedUser', () => ({
  requireAuthenticatedUser: (...args: unknown[]) => requireAuthenticatedUserMock(...args),
}));

// The ranking maths has its own coverage via the single-board route; what
// matters here is which boards get built and for whom.
vi.mock('@/app/api/group/_lib/leaderboard', () => ({
  buildLeaderboards: (...args: unknown[]) => buildLeaderboardsMock(...args),
}));

const tableData: Record<string, unknown[]> = {};
function setTable(table: string, rows: unknown[]) {
  tableData[table] = rows;
}

function makeChain(table: string) {
  const filters: [string, unknown][] = [];
  let ids: unknown[] | null = null;
  const rows = () =>
    (tableData[table] ?? []).filter((row) => {
      const r = row as Record<string, unknown>;
      if (ids && !ids.includes(r.id)) return false;
      return filters.every(([col, value]) => r[col] === value);
    });
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  chain.limit = vi.fn(() => chain);
  chain.eq = vi.fn((col: string, value: unknown) => {
    filters.push([col, value]);
    return chain;
  });
  chain.in = vi.fn((_col: string, values: unknown[]) => {
    ids = values;
    return chain;
  });
  chain.maybeSingle = vi.fn(() => Promise.resolve({ data: rows()[0] ?? null, error: null }));
  chain.then = (ok: (v: unknown) => unknown) =>
    Promise.resolve({ data: rows(), error: null }).then(ok);
  return chain;
}

vi.mock('@/app/api/group/_lib/serviceSupabase', () => ({
  getServiceSupabase: () => ({ from: (table: string) => makeChain(table) }),
}));

import { GET } from '@/app/api/group/leaderboards/route';

function makeRequest() {
  return new NextRequest('http://localhost/api/group/leaderboards', {
    headers: { authorization: 'Bearer tok', 'x-forwarded-for': '10.0.0.9' },
  });
}

const ADVANCED = {
  id: 'advanced',
  name: 'Advanced Conversation',
  emoji: '🗣️',
  show_leaderboard: true,
};
const BUSINESS = { id: 'business', name: 'Business Japanese', emoji: '💼', show_leaderboard: true };

const twoEntries = [{ id: 'a' }, { id: 'b' }];

beforeEach(() => {
  _resetStore();
  vi.clearAllMocks();
  for (const k of Object.keys(tableData)) delete tableData[k];
  requireAuthenticatedUserMock.mockResolvedValue({ id: 'kenji', account_type: 'member' });
  buildLeaderboardsMock.mockImplementation((specs: unknown[]) => specs.map(() => twoEntries));
  setTable('groups', [ADVANCED, BUSINESS]);
  setTable('group_members', []);
});

describe('GET /api/group/leaderboards', () => {
  it('returns one board per group, never a merged one', async () => {
    // Two groups run by different organizers: pooling them would rank
    // classmates who never meet against each other.
    setTable('group_members', [
      { group_id: 'advanced', organizer_id: 'org1', member_id: 'kenji' },
      { group_id: 'business', organizer_id: 'org2', member_id: 'kenji' },
    ]);

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body).toHaveLength(2);
    expect(body.map((b: { groupName: string }) => b.groupName)).toEqual([
      'Advanced Conversation',
      'Business Japanese',
    ]);
    // Each board is built against the organizer who runs that group, in one call.
    expect(buildLeaderboardsMock).toHaveBeenCalledTimes(1);
    expect(buildLeaderboardsMock.mock.calls[0][0]).toEqual([
      { organizerId: 'org1', groupId: 'advanced' },
      { organizerId: 'org2', groupId: 'business' },
    ]);
  });

  it('names the group so two boards can be told apart', async () => {
    setTable('group_members', [{ group_id: 'business', organizer_id: 'org2', member_id: 'kenji' }]);

    const body = await (await GET(makeRequest())).json();

    expect(body[0]).toMatchObject({
      groupId: 'business',
      groupName: 'Business Japanese',
      groupEmoji: '💼',
    });
  });

  it('leaves out a group whose organizer turned the leaderboard off', async () => {
    setTable('groups', [ADVANCED, { ...BUSINESS, show_leaderboard: false }]);
    setTable('group_members', [
      { group_id: 'advanced', organizer_id: 'org1', member_id: 'kenji' },
      { group_id: 'business', organizer_id: 'org2', member_id: 'kenji' },
    ]);

    const body = await (await GET(makeRequest())).json();

    expect(body.map((b: { groupId: string }) => b.groupId)).toEqual(['advanced']);
  });

  it('drops a board of one — there is nobody to compare against', async () => {
    setTable('group_members', [{ group_id: 'advanced', organizer_id: 'org1', member_id: 'kenji' }]);
    buildLeaderboardsMock.mockResolvedValue([[{ id: 'kenji' }]]);

    const body = await (await GET(makeRequest())).json();

    expect(body).toEqual([]);
  });

  it('covers groups the account runs as well as ones it learns in', async () => {
    requireAuthenticatedUserMock.mockResolvedValue({ id: 'org1', account_type: 'organizer' });
    setTable('groups', [{ ...ADVANCED, organizer_id: 'org1' }, BUSINESS]);
    setTable('group_members', [{ group_id: 'business', organizer_id: 'org2', member_id: 'org1' }]);

    const body = await (await GET(makeRequest())).json();

    expect(body.map((b: { groupId: string }) => b.groupId).sort()).toEqual([
      'advanced',
      'business',
    ]);
  });

  it('returns nothing for an account in no group', async () => {
    const res = await GET(makeRequest());

    await expect(res.json()).resolves.toEqual([]);
    expect(buildLeaderboardsMock).not.toHaveBeenCalled();
  });
});
