import type * as NextServer from 'next/server';
import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { _resetStore } from '@/app/api/_lib/rateLimit';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('next/server', async (importActual) => {
  const actual = await importActual<typeof NextServer>();
  // after() normally keeps the lambda alive for a background push notification;
  // outside a real request context it has nothing to hook into, so no-op it.
  return { ...actual, after: vi.fn() };
});

const { requireOrganizerAccountMock } = vi.hoisted(() => ({
  requireOrganizerAccountMock: vi.fn(),
}));

vi.mock('@/app/api/_lib/requireOrganizerAccount', () => ({
  requireOrganizerAccount: (...args: unknown[]) => requireOrganizerAccountMock(...args),
}));

vi.mock('@/app/api/_lib/sendPushNotification', () => ({
  sendPushToUser: vi.fn().mockResolvedValue(undefined),
}));

const tableData: Record<string, { data: unknown; error: unknown }> = {};
function setTable(table: string, data: unknown, error: unknown = null) {
  tableData[table] = { data, error };
}

const insertCalls: { table: string; args: unknown }[] = [];
const updateCalls: { table: string; args: unknown }[] = [];

function makeChain(table: string) {
  const result = () => tableData[table] ?? { data: null, error: null };
  const asPromise = () => Promise.resolve(result());
  const chain: Record<string, unknown> = {};
  ['select', 'eq', 'limit'].forEach((m) => {
    chain[m] = vi.fn(() => chain);
  });
  chain.insert = vi.fn((args: unknown) => {
    insertCalls.push({ table, args });
    return chain;
  });
  chain.update = vi.fn((args: unknown) => {
    updateCalls.push({ table, args });
    return chain;
  });
  chain.single = vi.fn(() => asPromise());
  chain.maybeSingle = vi.fn(() => asPromise());
  chain.then = (onful: (v: unknown) => unknown, onrej?: (e: unknown) => unknown) =>
    asPromise().then(onful, onrej);
  return chain;
}

const fromMock = vi.fn((table: string) => makeChain(table));

vi.mock('@/app/api/group/_lib/serviceSupabase', () => ({
  getServiceSupabase: () => ({ from: fromMock }),
}));

const { POST } = await import('@/app/api/group/encouragements/route');

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ORGANIZER = {
  id: 'org-1',
  username: 'teacher',
  display_name: 'Teacher',
  account_type: 'organizer',
};

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/group/encouragements', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer tok' },
    body: JSON.stringify(body),
  });
}

const BASE_BODY = { memberId: 'm1', message: 'Great job!', emoji: '🎉' };

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('POST /api/group/encouragements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetStore();
    for (const k of Object.keys(tableData)) delete tableData[k];
    insertCalls.length = 0;
    updateCalls.length = 0;
    requireOrganizerAccountMock.mockResolvedValue(ORGANIZER);
    setTable('group_members', [{ group_id: 'g1' }]);
    setTable('direct_messages', { id: 'msg1', sender_id: 'org-1', recipient_id: 'm1' });
    setTable('profiles', null);
  });

  it('returns 403 when the requester is not an organizer', async () => {
    requireOrganizerAccountMock.mockResolvedValue(
      NextResponse.json({ error: 'Organizers only.' }, { status: 403 }),
    );
    const res = await POST(makeRequest(BASE_BODY));
    expect(res.status).toBe(403);
  });

  it("returns 404 when the member is not on the organizer's roster", async () => {
    setTable('group_members', []);
    const res = await POST(makeRequest(BASE_BODY));
    expect(res.status).toBe(404);
  });

  it('sends the encouragement and stamps last_nudged_at on the recipient profile', async () => {
    const res = await POST(makeRequest(BASE_BODY));
    expect(res.status).toBe(201);

    const messageInsert = insertCalls.find((c) => c.table === 'direct_messages');
    expect(messageInsert?.args).toMatchObject({
      sender_id: 'org-1',
      recipient_id: 'm1',
      message: '🎉 Great job!',
    });

    const profileUpdate = updateCalls.find((c) => c.table === 'profiles');
    expect(profileUpdate?.args).toHaveProperty('last_nudged_at');
  });

  it('returns 500 and skips the stamp write when the message insert fails', async () => {
    setTable('direct_messages', null, { message: 'insert failed' });
    const res = await POST(makeRequest(BASE_BODY));
    expect(res.status).toBe(500);
    expect(updateCalls.find((c) => c.table === 'profiles')).toBeUndefined();
  });

  it('still returns 201 when the best-effort last_nudged_at stamp fails', async () => {
    setTable('profiles', null, { message: 'update failed' });
    const res = await POST(makeRequest(BASE_BODY));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toMatchObject({ id: 'msg1' });
  });

  it('requires memberId and a non-blank message', async () => {
    const res = await POST(makeRequest({ memberId: 'm1', message: '   ' }));
    expect(res.status).toBe(400);
  });
});
