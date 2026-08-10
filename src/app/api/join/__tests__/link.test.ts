import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { _resetStore } from '@/app/api/_lib/rateLimit';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const authUser = {
  id: 'user1',
  username: 'kenji',
  account_type: 'organizer',
  organizer_id: null as string | null,
  group_id: null as string | null,
  display_name: 'Kenji',
};

vi.mock('@/app/api/_lib/requireAuthenticatedUser', () => ({
  requireAuthenticatedUser: vi.fn(async () => authUser),
}));

vi.mock('@/app/api/_lib/authCache', () => ({
  invalidateProfileCache: vi.fn(),
  _resetAuthCache: vi.fn(),
  // The rate limiter keys this route on the account, so it resolves the token
  // too; null sends it down the IP fallback, which is what these tests want.
  getUserFromToken: vi.fn(async () => null),
}));

const tableData: Record<string, { data: unknown; error: unknown }> = {};
function setTable(table: string, data: unknown, error: unknown = null) {
  tableData[table] = { data, error };
}

const calls: { table: string; method: string; args: unknown[] }[] = [];

/**
 * Thenable query chain: every builder method returns itself, awaiting resolves.
 * `eq` filters the seeded rows, because membership checks differ only by the
 * group they ask about.
 */
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
  getServiceSupabase: () => ({ from: (table: string) => makeChain(table) }),
}));

const { POST } = await import('@/app/api/join/link/route');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(body: unknown = { code: 'ABC123' }) {
  return new NextRequest('http://localhost/api/join/link', {
    method: 'POST',
    headers: {
      authorization: 'Bearer token',
      'content-type': 'application/json',
      'x-forwarded-for': '10.0.0.1',
    },
    body: JSON.stringify(body),
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

function profileUpdate() {
  return calls.find((c) => c.table === 'profiles' && c.method === 'update');
}

/** Groups this account already learns in, as group_members rows. */
function setStoredMemberships(rows: { organizer_id: string; group_id: string }[]) {
  setTable(
    'group_members',
    rows.map((r) => ({ ...r, member_id: 'user1' })),
  );
}

function membershipUpsert() {
  return calls.find((c) => c.table === 'group_members' && c.method === 'upsert');
}

beforeEach(() => {
  _resetStore();
  calls.length = 0;
  for (const key of Object.keys(tableData)) delete tableData[key];
  Object.assign(authUser, {
    id: 'user1',
    account_type: 'organizer',
    organizer_id: null,
    group_id: null,
  });
  setTable('invite_codes', [INVITE]);
  setStoredMemberships([]);
  setTable('groups', []);
  setTable('decks', []);
  setTable('assignments', []);
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('POST /api/join/link', () => {
  it('puts the account in the group without touching its entitlement tier', async () => {
    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ success: true });
    expect(membershipUpsert()?.args[0]).toMatchObject({
      group_id: 'g1',
      member_id: 'user1',
      organizer_id: 'org1',
    });
    // account_type is billing state — joining a group must never write it.
    expect(profileUpdate()?.args[0]).toEqual({ organizer_id: 'org1', group_id: 'g1' });
  });

  it('lets an organizer who already runs a group join another one', async () => {
    setTable('groups', [{ id: 'their-group' }]);

    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    expect(profileUpdate()?.args[0]).toEqual({ organizer_id: 'org1', group_id: 'g1' });
  });

  // Someone can take an advanced conversation group and a business Japanese
  // group in the same term; the second code must not evict them from the first.
  it('adds the group alongside the one the account is already in', async () => {
    setStoredMemberships([{ organizer_id: 'old-org', group_id: 'old-group' }]);

    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    expect(membershipUpsert()?.args[0]).toMatchObject({ group_id: 'g1', organizer_id: 'org1' });
    // The old group keeps its decks: the learner is still in it.
    expect(calls.find((c) => c.table === 'deck_shares' && c.method === 'delete')).toBeUndefined();
    expect(calls.find((c) => c.table === 'group_members' && c.method === 'delete')).toBeUndefined();
  });

  // Assignments are one row per learner, so a group's open work is invisible to
  // someone who joins after it was set unless they are caught up.
  it('gives the joiner the group’s open assignments', async () => {
    setTable('assignments', [
      {
        member_id: 'other',
        group_id: 'g1',
        deck_id: 'd1',
        title: 'Week 1',
        note: null,
        due_date: '2099-01-01',
        available_on: null,
        required_accuracy: null,
        required_mode: null,
      },
    ]);

    await POST(makeRequest());

    const write = calls.find((c) => c.table === 'assignments' && c.method === 'upsert');
    expect(write?.args[0]).toEqual([
      expect.objectContaining({ member_id: 'user1', deck_id: 'd1', title: 'Week 1' }),
    ]);
    // One collision must not roll back the batch and leave the joiner nothing.
    expect(write?.args[1]).toMatchObject({ ignoreDuplicates: true });
  });

  it('gives the joiner the planned schedule when the group has no live assignments', async () => {
    setTable('planned_assignments', [
      {
        group_id: 'g1',
        deck_id: 'd1',
        title: 'Week 1 — Food',
        note: null,
        due_date: '2099-01-01',
        available_on: null,
        required_accuracy: null,
        required_mode: null,
      },
    ]);

    await POST(makeRequest());

    const write = calls.find((c) => c.table === 'assignments' && c.method === 'upsert');
    expect(write?.args[0]).toEqual([
      expect.objectContaining({ member_id: 'user1', deck_id: 'd1', title: 'Week 1 — Food' }),
    ]);
  });

  it('prefers the group’s live handout over the planned one for the same deck', async () => {
    setTable('assignments', [
      {
        member_id: 'other',
        group_id: 'g1',
        deck_id: 'd1',
        title: 'Week 1 (moved)',
        note: null,
        due_date: '2099-02-01',
        available_on: null,
        required_accuracy: null,
        required_mode: null,
      },
    ]);
    setTable('planned_assignments', [
      {
        group_id: 'g1',
        deck_id: 'd1',
        title: 'Week 1 — Food',
        note: null,
        due_date: '2099-01-01',
        available_on: null,
        required_accuracy: null,
        required_mode: null,
      },
    ]);

    await POST(makeRequest());

    const write = calls.find((c) => c.table === 'assignments' && c.method === 'upsert');
    expect(write?.args[0]).toEqual([
      expect.objectContaining({ member_id: 'user1', deck_id: 'd1', title: 'Week 1 (moved)' }),
    ]);
  });

  it('releases the invite when the membership cannot be written', async () => {
    setTable('group_members', null, { message: 'boom' });

    const res = await POST(makeRequest());

    expect(res.status).toBe(500);
    const inviteUpdates = calls.filter((c) => c.table === 'invite_codes' && c.method === 'update');
    // Claimed, then handed straight back.
    expect(inviteUpdates).toHaveLength(2);
  });

  it('shares the organizer decks it does not already share', async () => {
    setTable('decks', [
      { id: 'd1', user_id: 'org1' },
      { id: 'd2', user_id: 'org1' },
    ]);

    await POST(makeRequest());

    const upsert = calls.find((c) => c.table === 'deck_shares' && c.method === 'upsert');
    expect(upsert?.args[0]).toEqual([
      { deck_id: 'd1', owner_id: 'org1', shared_with: 'user1' },
      { deck_id: 'd2', owner_id: 'org1', shared_with: 'user1' },
    ]);
    expect(upsert?.args[1]).toMatchObject({ ignoreDuplicates: true });
  });

  it('refuses the organizer’s own invite', async () => {
    authUser.id = 'org1';

    const res = await POST(makeRequest());

    expect(res.status).toBe(400);
    expect(profileUpdate()).toBeUndefined();
  });

  it('returns a stable code for each refusal so the client can localise it', async () => {
    authUser.id = 'org1';

    const res = await POST(makeRequest());

    await expect(res.json()).resolves.toMatchObject({ code: 'ownInvite' });
  });

  it('is a no-op when the account is already in that group', async () => {
    authUser.account_type = 'member';
    setStoredMemberships([{ organizer_id: 'org1', group_id: 'g1' }]);

    const res = await POST(makeRequest());

    await expect(res.json()).resolves.toEqual({ success: true, alreadyJoined: true });
    expect(calls.find((c) => c.table === 'invite_codes' && c.method === 'update')).toBeUndefined();
    expect(profileUpdate()).toBeUndefined();
  });

  it('rejects an expired invite', async () => {
    setTable('invite_codes', [{ ...INVITE, expires_at: '2020-01-01T00:00:00Z' }]);

    const res = await POST(makeRequest());

    expect(res.status).toBe(410);
    expect(profileUpdate()).toBeUndefined();
  });

  it('rejects a fully used invite', async () => {
    setTable('invite_codes', [{ ...INVITE, max_uses: 3, times_used: 3 }]);

    const res = await POST(makeRequest());

    expect(res.status).toBe(410);
    expect(profileUpdate()).toBeUndefined();
  });

  it('requires a code', async () => {
    const res = await POST(makeRequest({}));

    expect(res.status).toBe(400);
  });
});
