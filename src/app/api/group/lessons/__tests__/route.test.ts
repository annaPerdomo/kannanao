import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { _resetStore } from '@/app/api/_lib/rateLimit';

const { requireGroupAccessMock } = vi.hoisted(() => ({
  requireGroupAccessMock: vi.fn(),
}));

vi.mock('@/app/api/group/_lib/requireGroupAccess', () => ({
  requireGroupAccess: (...args: unknown[]) => requireGroupAccessMock(...args),
}));

const tableData: Record<string, { data: unknown; error: unknown }> = {};
function setTable(table: string, data: unknown, error: unknown = null) {
  tableData[table] = { data, error };
}

function makeChain(table: string) {
  const asPromise = () => Promise.resolve(tableData[table] ?? { data: [], error: null });
  const chain: Record<string, unknown> = {};
  ['select', 'eq', 'in', 'order', 'range'].forEach((m) => {
    chain[m] = vi.fn(() => chain);
  });
  chain.then = (onfulfilled: (v: unknown) => unknown, onrejected?: (e: unknown) => unknown) =>
    asPromise().then(onfulfilled, onrejected);
  return chain;
}

vi.mock('@/app/api/group/_lib/serviceSupabase', () => ({
  getServiceSupabase: () => ({ from: (table: string) => makeChain(table) }),
}));

import { GET } from '@/app/api/group/lessons/route';

const ORGANIZER = {
  organizer: { id: 'org1', username: 'teacher', account_type: 'organizer' },
  group: { id: 'g1' },
};

function request(query: string) {
  return new NextRequest(`http://localhost/api/group/lessons?${query}`, { method: 'GET' });
}

describe('GET /api/group/lessons', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetStore();
    for (const key of Object.keys(tableData)) delete tableData[key];
    requireGroupAccessMock.mockResolvedValue(ORGANIZER);
    setTable('lesson_plans', []);
    setTable('lesson_plan_decks', []);
    setTable('planned_assignments', []);
    setTable('assignments', []);
    setTable('decks', []);
  });

  it('400s when groupId is missing', async () => {
    const res = await GET(request(''));
    expect(res.status).toBe(400);
  });

  it('passes through a 404 from requireGroupAccess', async () => {
    requireGroupAccessMock.mockResolvedValue(
      NextResponse.json({ error: 'Group not found.' }, { status: 404 }),
    );
    const res = await GET(request('groupId=g1'));
    expect(res.status).toBe(404);
  });

  it('returns a lesson library shaped response on the happy path', async () => {
    setTable('lesson_plans', [
      { id: 'p1', title: 'Unit 1', jlpt_level: 'N5', created_at: '2026-09-01T00:00:00Z' },
    ]);
    setTable('lesson_plan_decks', [{ plan_id: 'p1', deck_id: 'd1', position: 0 }]);
    setTable('decks', [{ id: 'd1', name: 'Food', emoji: '🍜' }]);
    setTable('planned_assignments', [
      {
        deck_id: 'd1',
        title: 'Week 1 — Food',
        note: null,
        due_date: '2026-10-09',
        available_on: '2026-10-02',
        required_accuracy: null,
        required_mode: null,
      },
    ]);

    const res = await GET(request('groupId=g1'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.units).toHaveLength(1);
    expect(body.units[0]).toMatchObject({ id: 'p1', title: 'Unit 1' });
    expect(body.units[0].weeks[0]).toMatchObject({ deckId: 'd1', week: 1, title: 'Week 1 — Food' });
    expect(body.loose).toEqual([]);
  });

  it('lists a deck with an assignment but no plan as loose', async () => {
    setTable('assignments', [
      {
        deck_id: 'd1',
        title: 'Solo deck',
        note: null,
        due_date: '2026-10-09',
        available_on: null,
        required_accuracy: null,
        required_mode: null,
        completed_at: null,
      },
    ]);
    setTable('decks', [{ id: 'd1', name: 'Solo', emoji: null }]);

    const res = await GET(request('groupId=g1'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.units).toEqual([]);
    expect(body.loose).toHaveLength(1);
    expect(body.loose[0]).toMatchObject({ deckId: 'd1', week: null, title: 'Solo deck' });
  });

  it('500s and logs on a query error', async () => {
    setTable('lesson_plans', null, { message: 'boom' });
    const res = await GET(request('groupId=g1'));
    expect(res.status).toBe(500);
  });
});
