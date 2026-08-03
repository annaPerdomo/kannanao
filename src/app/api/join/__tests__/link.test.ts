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
}));

const tableData: Record<string, { data: unknown; error: unknown }> = {};
function setTable(table: string, data: unknown, error: unknown = null) {
  tableData[table] = { data, error };
}

const calls: { table: string; method: string; args: unknown[] }[] = [];

/** Thenable query chain: every builder method returns itself, awaiting resolves. */
function makeChain(table: string) {
  const result = () => tableData[table] ?? { data: [], error: null };
  const chain: Record<string, unknown> = {};
  ['select', 'eq', 'limit', 'update', 'insert', 'upsert', 'delete'].forEach((m) => {
    chain[m] = vi.fn((...args: unknown[]) => {
      calls.push({ table, method: m, args });
      return chain;
    });
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
  organizer_id: 'org1',
  group_id: 'g1',
  max_uses: null,
  times_used: 0,
  expires_at: null,
};

function profileUpdate() {
  return calls.find((c) => c.table === 'profiles' && c.method === 'update');
}

/** The membership the route reads back off the database, not off the auth cache. */
function setStoredMembership(organizerId: string | null, groupId: string | null) {
  setTable('profiles', [{ organizer_id: organizerId, group_id: groupId }]);
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
  setStoredMembership(null, null);
  setTable('groups', []);
  setTable('decks', []);
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('POST /api/join/link', () => {
  it('puts the account in the group without touching its entitlement tier', async () => {
    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ success: true });
    // account_type is billing state — joining a group must never write it.
    expect(profileUpdate()?.args[0]).toEqual({ organizer_id: 'org1', group_id: 'g1' });
  });

  it('lets an organizer who already runs a group join another one', async () => {
    setTable('groups', [{ id: 'their-group' }]);

    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    expect(profileUpdate()?.args[0]).toEqual({ organizer_id: 'org1', group_id: 'g1' });
  });

  it('revokes the previous organizer’s shared decks when switching groups', async () => {
    setStoredMembership('old-org', 'old-group');

    await POST(makeRequest());

    const del = calls.find((c) => c.table === 'deck_shares' && c.method === 'delete');
    expect(del).toBeDefined();
    const eqArgs = calls
      .filter((c) => c.table === 'deck_shares' && c.method === 'eq')
      .map((c) => c.args);
    expect(eqArgs).toContainEqual(['owner_id', 'old-org']);
    expect(eqArgs).toContainEqual(['shared_with', 'user1']);
  });

  it('revokes on the stored membership even when the cached profile is stale', async () => {
    // The auth cache is per-instance and up to 60s old: a second group change
    // within the minute can be served by an instance that still thinks the
    // account is in no group. Trusting it would leave the old decks shared.
    authUser.organizer_id = null;
    setStoredMembership('old-org', 'old-group');

    await POST(makeRequest());

    const eqArgs = calls
      .filter((c) => c.table === 'deck_shares' && c.method === 'eq')
      .map((c) => c.args);
    expect(eqArgs).toContainEqual(['owner_id', 'old-org']);
  });

  it('fails closed without burning the invite when membership cannot be read', async () => {
    setTable('profiles', null, { message: 'boom' });

    const res = await POST(makeRequest());

    expect(res.status).toBe(500);
    expect(calls.find((c) => c.table === 'invite_codes' && c.method === 'update')).toBeUndefined();
  });

  it('does not revoke anything when the account was in no group', async () => {
    await POST(makeRequest());

    expect(calls.find((c) => c.table === 'deck_shares' && c.method === 'delete')).toBeUndefined();
  });

  it('shares the organizer decks it does not already share', async () => {
    setTable('decks', [{ id: 'd1' }, { id: 'd2' }]);

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
    setStoredMembership('org1', 'g1');

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
