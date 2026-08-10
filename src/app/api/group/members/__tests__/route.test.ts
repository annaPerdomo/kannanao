import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { _resetStore } from '@/app/api/_lib/rateLimit';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const { requireOrganizerAccountMock } = vi.hoisted(() => ({
  requireOrganizerAccountMock: vi.fn(),
}));

vi.mock('@/app/api/_lib/requireOrganizerAccount', () => ({
  requireOrganizerAccount: (...args: unknown[]) => requireOrganizerAccountMock(...args),
}));

vi.mock('@/app/api/group/_lib/membership', () => ({
  memberIdsFor: vi.fn().mockResolvedValue(['m1', 'm2']),
}));

const tableData: Record<string, { data: unknown; error: unknown }> = {};
function setTable(table: string, data: unknown, error: unknown = null) {
  tableData[table] = { data, error };
}

function makeChain(table: string) {
  const asPromise = () => Promise.resolve(tableData[table] ?? { data: null, error: null });
  const chain: Record<string, unknown> = {};
  ['select', 'eq', 'in', 'order'].forEach((m) => {
    chain[m] = vi.fn(() => chain);
  });
  chain.then = (onfulfilled: (v: unknown) => unknown, onrejected?: (e: unknown) => unknown) =>
    asPromise().then(onfulfilled, onrejected);
  return chain;
}

const rpcMock = vi.fn();

vi.mock('@/app/api/group/_lib/serviceSupabase', () => ({
  getServiceSupabase: () => ({ from: (table: string) => makeChain(table), rpc: rpcMock }),
}));

import { GET } from '@/app/api/group/members/route';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ORGANIZER = { id: 'org-1', username: 'teacher', account_type: 'organizer' };

function request() {
  return new NextRequest('http://localhost/api/group/members', { method: 'GET' });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('GET /api/group/members — mastery totals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetStore();
    for (const key of Object.keys(tableData)) delete tableData[key];
    requireOrganizerAccountMock.mockResolvedValue(ORGANIZER);
    rpcMock.mockResolvedValue({ data: [], error: null });
    setTable('profiles', [
      {
        id: 'm1',
        username: 'naomi',
        display_name: 'Naomi',
        avatar: null,
        created_at: '2026-01-01',
      },
      { id: 'm2', username: 'taro', display_name: null, avatar: null, created_at: '2026-01-02' },
    ]);
  });

  it('refuses a member account', async () => {
    requireOrganizerAccountMock.mockResolvedValue(
      NextResponse.json({ error: 'Organizer only.' }, { status: 403 }),
    );
    const res = await GET(request());
    expect(res.status).toBe(403);
  });

  it("splits each member's card_progress rows into learning vs strong, never new", async () => {
    setTable('user_progress', []);
    setTable('card_progress', [
      // m1: one strong, one shaky-so-learning
      { user_id: 'm1', interval_days: 5, ease: 2.5 },
      { user_id: 'm1', interval_days: 0, ease: 2.3 },
      // m2: never touched a card
    ]);

    const res = await GET(request());
    const body = await res.json();

    const m1 = body.find((m: { id: string }) => m.id === 'm1');
    const m2 = body.find((m: { id: string }) => m.id === 'm2');
    expect(m1).toMatchObject({ masteryLearning: 1, masteryStrong: 1 });
    expect(m2).toMatchObject({ masteryLearning: 0, masteryStrong: 0 });
  });

  it('returns zeroed mastery for every member when nobody has card_progress rows', async () => {
    setTable('user_progress', []);
    setTable('card_progress', []);
    const res = await GET(request());
    const body = await res.json();
    for (const m of body) {
      expect(m.masteryLearning).toBe(0);
      expect(m.masteryStrong).toBe(0);
    }
  });
});

describe('GET /api/group/members — review backlog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetStore();
    for (const key of Object.keys(tableData)) delete tableData[key];
    requireOrganizerAccountMock.mockResolvedValue(ORGANIZER);
    rpcMock.mockResolvedValue({ data: [], error: null });
    setTable('profiles', [
      {
        id: 'm1',
        username: 'naomi',
        display_name: 'Naomi',
        avatar: null,
        created_at: '2026-01-01',
      },
      { id: 'm2', username: 'taro', display_name: null, avatar: null, created_at: '2026-01-02' },
    ]);
    setTable('user_progress', []);
    setTable('card_progress', []);
  });

  it('merges the backlog counts onto the matching member', async () => {
    rpcMock.mockResolvedValue({
      data: [{ user_id: 'm1', due_count: 34, overdue_3d_count: 12 }],
      error: null,
    });

    const res = await GET(request());
    const body = await res.json();

    expect(rpcMock).toHaveBeenCalledWith('group_review_backlog', { p_user_ids: ['m1', 'm2'] });
    expect(body.find((m: { id: string }) => m.id === 'm1')).toMatchObject({
      reviewsWaiting: 34,
      reviewsOverdue3d: 12,
    });
  });

  // The function returns no row at all for a learner with nothing due, so the
  // zero has to come from the route rather than from the query.
  it('defaults a member with no card_progress rows to zero', async () => {
    rpcMock.mockResolvedValue({
      data: [{ user_id: 'm1', due_count: 5, overdue_3d_count: 0 }],
      error: null,
    });

    const res = await GET(request());
    const body = await res.json();

    expect(body.find((m: { id: string }) => m.id === 'm2')).toMatchObject({
      reviewsWaiting: 0,
      reviewsOverdue3d: 0,
    });
  });

  // A zeroed column renders as "everyone is caught up" off a query that never ran.
  it('reports an unknown backlog as null when the query fails', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'boom' } });

    const res = await GET(request());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toHaveLength(2);
    expect(
      body.every(
        (m: { reviewsWaiting: number | null; reviewsOverdue3d: number | null }) =>
          m.reviewsWaiting === null && m.reviewsOverdue3d === null,
      ),
    ).toBe(true);
  });
});
