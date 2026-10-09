import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { _resetStore } from '@/app/api/_lib/rateLimit';

const { requireGroupAccessMock, assignCompanionKanaMock, memberIdsForMock } = vi.hoisted(() => ({
  requireGroupAccessMock: vi.fn(),
  assignCompanionKanaMock: vi.fn(),
  memberIdsForMock: vi.fn(),
}));

vi.mock('@/app/api/group/_lib/requireGroupAccess', () => ({
  requireGroupAccess: (...args: unknown[]) => requireGroupAccessMock(...args),
}));
vi.mock('@/app/api/group/_lib/assignCompanionKana', () => ({
  assignCompanionKana: (...args: unknown[]) => assignCompanionKanaMock(...args),
}));
vi.mock('@/app/api/group/_lib/membership', () => ({
  memberIdsFor: (...args: unknown[]) => memberIdsForMock(...args),
}));

interface TableResult {
  data?: unknown;
  error?: unknown;
  count?: number;
  rows?: Record<string, unknown>[];
}

const tableData: Record<string, TableResult> = {};
function setTable(table: string, result: TableResult) {
  tableData[table] = result;
}
const updateCalls: { table: string; updates: unknown }[] = [];
const deleteCalls: { table: string; isCols: string[]; inArgs: unknown[] }[] = [];

function makeChain(table: string) {
  const current = { table, isCols: [] as string[], inArgs: [] as unknown[] };
  const eqs: [string, unknown][] = [];
  const ins: [string, unknown[]][] = [];
  const neqs: [string, unknown][] = [];
  const resolve = () => {
    const stored = tableData[table];
    if (!stored || !stored.rows) {
      return { data: null, error: null, count: 0, ...(stored ?? {}) };
    }
    let rows = stored.rows;
    for (const [col, val] of eqs) rows = rows.filter((r) => r[col] === val);
    for (const [col, vals] of ins) rows = rows.filter((r) => vals.includes(r[col]));
    for (const [col, val] of neqs) rows = rows.filter((r) => r[col] !== val);
    return { data: rows, error: null, count: rows.length };
  };
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn((col: string, val: unknown) => {
    eqs.push([col, val]);
    return chain;
  });
  chain.order = vi.fn(() => chain);
  chain.in = vi.fn((col: string, vals: unknown[]) => {
    current.inArgs.push([col, vals]);
    ins.push([col, vals]);
    return chain;
  });
  chain.neq = vi.fn((col: string, val: unknown) => {
    neqs.push([col, val]);
    return chain;
  });
  chain.is = vi.fn((col: string) => {
    current.isCols.push(col);
    return chain;
  });
  chain.maybeSingle = vi.fn(() => {
    const stored = tableData[table];
    if (!stored?.rows) return Promise.resolve(resolve());
    const result = resolve();
    const rows = (result.data as unknown[]) ?? [];
    return Promise.resolve({ ...result, data: rows[0] ?? null });
  });
  chain.update = vi.fn((updates: unknown) => {
    updateCalls.push({ table, updates });
    return chain;
  });
  chain.delete = vi.fn(() => {
    deleteCalls.push(current);
    return chain;
  });
  chain.then = (onfulfilled: (v: unknown) => unknown, onrejected?: (e: unknown) => unknown) =>
    Promise.resolve(resolve()).then(onfulfilled, onrejected);
  return chain;
}

vi.mock('@/app/api/group/_lib/serviceSupabase', () => ({
  getServiceSupabase: () => ({ from: (table: string) => makeChain(table) }),
}));

import { PATCH } from '@/app/api/group/lessons/kana/route';

const ACCESS = {
  organizer: { id: 'org1', username: 'teacher', account_type: 'organizer' },
  group: { id: 'g1' },
};

function request(body: unknown) {
  return new NextRequest('http://localhost/api/group/lessons/kana', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('PATCH /api/group/lessons/kana', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetStore();
    updateCalls.length = 0;
    deleteCalls.length = 0;
    for (const key of Object.keys(tableData)) delete tableData[key];
    requireGroupAccessMock.mockResolvedValue(ACCESS);
    setTable('lesson_plan_decks', {
      rows: [{ plan_id: 'plan1', deck_id: 'd1', kana_sets: ['hira-a'] }],
    });
    setTable('lesson_plans', { rows: [{ id: 'plan1', organizer_id: 'org1', group_id: 'g1' }] });
    setTable('planned_assignments', { count: 0, data: null });
    setTable('assignments', { count: 0, data: [] });
    memberIdsForMock.mockResolvedValue(['m1', 'm2']);
    assignCompanionKanaMock.mockResolvedValue({ assigned: ['hira-ka'], failed: [] });
  });

  it('400s when kanaSets has an unknown id', async () => {
    const res = await PATCH(request({ groupId: 'g1', deckId: 'd1', kanaSets: ['not-a-set'] }));
    expect(res.status).toBe(400);
  });

  it('404s when the deck is not part of a lesson', async () => {
    setTable('lesson_plan_decks', { rows: [] });
    const res = await PATCH(request({ groupId: 'g1', deckId: 'd1', kanaSets: ['hira-a'] }));
    expect(res.status).toBe(404);
  });

  it('resolves this group plan row when the deck was also copied into another group', async () => {
    setTable('lesson_plans', {
      rows: [
        { id: 'foreign-plan', organizer_id: 'org1', group_id: 'g2' },
        { id: 'plan1', organizer_id: 'org1', group_id: 'g1' },
      ],
    });
    setTable('lesson_plan_decks', {
      rows: [
        { plan_id: 'foreign-plan', deck_id: 'd1', kana_sets: ['hira-x'] },
        { plan_id: 'plan1', deck_id: 'd1', kana_sets: ['hira-a'] },
      ],
    });
    const res = await PATCH(request({ groupId: 'g1', deckId: 'd1', kanaSets: ['hira-ka'] }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.kanaSets).toEqual(['hira-ka']);
  });

  it('only updates the column for a draft lesson', async () => {
    const res = await PATCH(
      request({ groupId: 'g1', deckId: 'd1', kanaSets: ['hira-ka', 'hira-a'] }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      kanaSets: ['hira-a', 'hira-ka'],
      kanaAssigned: [],
      kanaFailed: [],
      removed: 0,
    });
    expect(assignCompanionKanaMock).not.toHaveBeenCalled();
  });

  it('assigns added rows and removes unfinished rows for removed sets on a handed-out lesson', async () => {
    setTable('planned_assignments', { count: 1, data: { due_date: '2026-10-20' } });
    setTable('assignments', { count: 2, data: [{ id: 'row1' }] });

    const res = await PATCH(request({ groupId: 'g1', deckId: 'd1', kanaSets: ['hira-ka'] }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.kanaAssigned).toEqual(['hira-ka']);
    expect(body.removed).toBe(1);
    expect(assignCompanionKanaMock).toHaveBeenCalledWith(
      expect.objectContaining({ rows: [{ setId: 'hira-ka', dueDate: '2026-10-20' }] }),
    );
    const deleteCall = deleteCalls.find((c) => c.table === 'assignments');
    expect(deleteCall?.isCols).toContain('completed_at');
  });

  it('does not delete a removed set still listed by another lesson in this group', async () => {
    setTable('lesson_plan_decks', {
      rows: [
        { plan_id: 'plan1', deck_id: 'd1', kana_sets: ['hira-a'] },
        { plan_id: 'plan1', deck_id: 'd2', kana_sets: ['hira-a'] },
      ],
    });
    setTable('planned_assignments', { count: 1, data: { due_date: '2026-10-20' } });
    setTable('assignments', { count: 2, data: [{ id: 'row1' }] });

    const res = await PATCH(request({ groupId: 'g1', deckId: 'd1', kanaSets: [] }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.removed).toBe(0);
    expect(deleteCalls.find((c) => c.table === 'assignments')).toBeUndefined();
  });

  it('passes through a non-200 from requireGroupAccess', async () => {
    requireGroupAccessMock.mockResolvedValue(
      NextResponse.json({ error: 'Group not found.' }, { status: 404 }),
    );
    const res = await PATCH(request({ groupId: 'g1', deckId: 'd1', kanaSets: [] }));
    expect(res.status).toBe(404);
  });
});
