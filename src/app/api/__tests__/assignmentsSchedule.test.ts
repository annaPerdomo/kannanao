import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { _resetStore } from '@/app/api/_lib/rateLimit';
import { availableNowFilter } from '@/lib/assignmentAvailability';

vi.mock('@/app/api/_lib/requireOrganizerAccount', () => ({
  requireOrganizerAccount: vi.fn().mockResolvedValue({
    id: 'org1',
    username: 'organizer',
    account_type: 'organizer',
  }),
}));

vi.mock('@/app/api/_lib/authCache', () => ({
  getUserFromToken: vi.fn().mockResolvedValue({ id: 'member1' }),
  getProfileForUser: vi.fn().mockResolvedValue({ account_type: 'member', organizer_id: 'org1' }),
  getUserFromTokenResult: vi.fn().mockResolvedValue({ value: { id: 'member1' }, error: null }),
  getProfileForUserResult: vi
    .fn()
    .mockResolvedValue({ value: { account_type: 'member', organizer_id: 'org1' }, error: null }),
  // rateLimit's _resetStore clears this cache too.
  _resetAuthCache: vi.fn(),
}));

/** Every filter/order the member query applied, so the test can assert on them. */
const applied: { method: string; args: unknown[] }[] = [];
const inserted: Record<string, unknown>[] = [];

vi.mock('@/app/api/group/_lib/serviceSupabase', () => ({
  getServiceSupabase: () => ({
    from(table: string) {
      const chain: Record<string, unknown> = {};
      for (const method of ['select', 'eq', 'or', 'order', 'in', 'limit']) {
        chain[method] = (...args: unknown[]) => {
          if (table === 'assignments') applied.push({ method, args });
          return chain;
        };
      }
      chain.single = () => Promise.resolve({ data: { id: 'group1' }, error: null });
      chain.maybeSingle = () => Promise.resolve({ data: { id: 'group1' }, error: null });
      chain.upsert = (rows: Record<string, unknown>[]) => {
        inserted.push(...rows);
        return { select: () => Promise.resolve({ data: rows, error: null }) };
      };
      // The POST path validates members against `group_members` before inserting.
      chain.then = (ok: (r: unknown) => unknown) =>
        Promise.resolve({
          data: table === 'group_members' ? [{ member_id: 'member1' }] : [],
          error: null,
        }).then(ok);
      return chain;
    },
  }),
}));

import { GET, POST } from '@/app/api/group/assignments/route';

function postRequest(body: unknown) {
  return new NextRequest('http://localhost/api/group/assignments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function getRequest(scope: string) {
  return new NextRequest(`http://localhost/api/group/assignments?scope=${scope}`, {
    headers: { authorization: 'Bearer token' },
  });
}

beforeEach(() => {
  _resetStore();
  applied.length = 0;
  inserted.length = 0;
});

describe('POST /api/group/assignments — availableOn', () => {
  it('rejects a start date that is not YYYY-MM-DD', async () => {
    const res = await POST(
      postRequest({ memberIds: ['member1'], deckId: 'deck1', availableOn: 'next monday' }),
    );
    expect(res.status).toBe(400);
  });

  it('stores the start date when given', async () => {
    const res = await POST(
      postRequest({
        memberIds: ['member1'],
        deckId: 'deck1',
        groupId: 'group1',
        availableOn: '2026-08-16',
      }),
    );
    expect(res.status).toBe(201);
    expect(inserted[0]?.available_on).toBe('2026-08-16');
  });

  it('defaults to null so an assignment shows up right away', async () => {
    await POST(postRequest({ memberIds: ['member1'], deckId: 'deck1', groupId: 'group1' }));
    expect(inserted[0]?.available_on).toBeNull();
  });
});

describe('GET /api/group/assignments — the learner list', () => {
  it('hides assignments whose start date has not arrived', async () => {
    await GET(getRequest('mine'));
    const filter = applied.find((c) => c.method === 'or');
    expect(filter).toBeDefined();
    // Not UTC: the deck library computes the same boundary in the browser, and
    // the two sides disagreeing shows a deck whose assignment says it is not
    // due to start yet.
    expect(filter?.args[0]).toBe(availableNowFilter());
  });

  it('orders by soonest deadline, not by newest', async () => {
    await GET(getRequest('mine'));
    const firstOrder = applied.find((c) => c.method === 'order');
    expect(firstOrder?.args[0]).toBe('due_date');
    expect(firstOrder?.args[1]).toMatchObject({ ascending: true, nullsFirst: false });
  });

  it('does not hide scheduled assignments from the organizer', async () => {
    await GET(getRequest('given'));
    expect(applied.some((c) => c.method === 'or')).toBe(false);
  });
});
