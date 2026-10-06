import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { _resetStore } from '@/app/api/_lib/rateLimit';

const { requireOrganizerAccountMock, requireGroupAccessMock } = vi.hoisted(() => ({
  requireOrganizerAccountMock: vi.fn(),
  requireGroupAccessMock: vi.fn(),
}));

vi.mock('@/app/api/_lib/requireOrganizerAccount', () => ({
  requireOrganizerAccount: (...args: unknown[]) => requireOrganizerAccountMock(...args),
}));
vi.mock('@/app/api/group/_lib/requireGroupAccess', () => ({
  requireGroupAccess: (...args: unknown[]) => requireGroupAccessMock(...args),
}));

interface TableResult {
  data?: unknown;
  error?: unknown;
}

const tableData: Record<string, TableResult> = {};
function setTable(table: string, result: TableResult) {
  tableData[table] = result;
}
const updateCalls: {
  table: string;
  updates: unknown;
  eqs: [string, unknown][];
  isCols: string[];
}[] = [];
const rpcMock = vi.fn().mockResolvedValue({ data: null, error: null });

function makeChain(table: string) {
  const asPromise = () => Promise.resolve({ data: null, error: null, ...(tableData[table] ?? {}) });
  const current = {
    table,
    updates: undefined as unknown,
    eqs: [] as [string, unknown][],
    isCols: [] as string[],
  };
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  chain.eq = vi.fn((col: string, val: unknown) => {
    current.eqs.push([col, val]);
    return chain;
  });
  chain.is = vi.fn((col: string) => {
    current.isCols.push(col);
    return chain;
  });
  chain.in = vi.fn(() => chain);
  chain.update = vi.fn((updates: unknown) => {
    current.updates = updates;
    updateCalls.push(current);
    return chain;
  });
  chain.single = vi.fn(() => asPromise());
  chain.maybeSingle = vi.fn(() => asPromise());
  chain.then = (onfulfilled: (v: unknown) => unknown, onrejected?: (e: unknown) => unknown) =>
    asPromise().then(onfulfilled, onrejected);
  return chain;
}

vi.mock('@/app/api/group/_lib/serviceSupabase', () => ({
  getServiceSupabase: () => ({
    from: (table: string) => makeChain(table),
    rpc: (...args: unknown[]) => rpcMock(...args),
  }),
}));

import { PATCH } from '@/app/api/group/lessons/[planId]/route';

const ORGANIZER = { id: 'org1', username: 'teacher', account_type: 'organizer' };
const ACCESS = { organizer: ORGANIZER, group: { id: 'g1' } };

function request(body: unknown) {
  return new NextRequest('http://localhost/api/group/lessons/plan1', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function call(body: unknown) {
  return PATCH(request(body), { params: Promise.resolve({ planId: 'plan1' }) });
}

describe('PATCH /api/group/lessons/[planId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetStore();
    updateCalls.length = 0;
    rpcMock.mockReset().mockResolvedValue({ data: null, error: null });
    for (const key of Object.keys(tableData)) delete tableData[key];
    requireOrganizerAccountMock.mockResolvedValue(ORGANIZER);
    requireGroupAccessMock.mockResolvedValue(ACCESS);
    setTable('lesson_plans', { data: { id: 'plan1', organizer_id: 'org1', group_id: 'g1' } });
  });

  it('passes through a non-200 from requireOrganizerAccount', async () => {
    requireOrganizerAccountMock.mockResolvedValue(
      NextResponse.json({ error: 'nope' }, { status: 403 }),
    );
    const res = await call({ title: 'X' });
    expect(res.status).toBe(403);
  });

  it("404s when the plan is not this organizer's", async () => {
    setTable('lesson_plans', { data: null });
    const res = await call({ title: 'X' });
    expect(res.status).toBe(404);
  });

  it('passes through a non-200 from requireGroupAccess (group mismatch)', async () => {
    requireGroupAccessMock.mockResolvedValue(
      NextResponse.json({ error: 'Group not found.' }, { status: 404 }),
    );
    const res = await call({ title: 'X' });
    expect(res.status).toBe(404);
  });

  it('400s on an invalid body', async () => {
    const res = await PATCH(
      new NextRequest('http://localhost/api/group/lessons/plan1', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: 'not json',
      }),
      { params: Promise.resolve({ planId: 'plan1' }) },
    );
    expect(res.status).toBe(400);
  });

  it('trims and caps the title, treating blank as null', async () => {
    const res = await call({ title: '  My Unit  ' });
    expect(res.status).toBe(200);
    const planUpdate = updateCalls.find((c) => c.table === 'lesson_plans');
    expect(planUpdate?.updates).toEqual({ title: 'My Unit' });
  });

  it('rejects shift days of 0', async () => {
    const res = await call({ shift: { fromDeckId: 'd1', days: 0 } });
    expect(res.status).toBe(400);
  });

  it('rejects shift days of 61', async () => {
    const res = await call({ shift: { fromDeckId: 'd1', days: 61 } });
    expect(res.status).toBe(400);
  });

  it('404s when fromDeckId is not a week in this unit', async () => {
    setTable('lesson_plan_decks', { data: [{ deck_id: 'd1', position: 0 }] });
    const res = await call({ shift: { fromDeckId: 'd9', days: 7 } });
    expect(res.status).toBe(404);
  });

  it('shifts via the shift_lesson_plan RPC with the from position, and never issues per-row updates', async () => {
    setTable('lesson_plan_decks', {
      data: [
        { deck_id: 'd0', position: 0 },
        { deck_id: 'd1', position: 1 },
        { deck_id: 'd2', position: 2 },
      ],
    });

    const res = await call({ shift: { fromDeckId: 'd1', days: 7 } });
    expect(res.status).toBe(200);

    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).toHaveBeenCalledWith('shift_lesson_plan', {
      p_plan_id: 'plan1',
      p_organizer_id: 'org1',
      p_group_id: 'g1',
      p_from_position: 1,
      p_days: 7,
    });

    expect(updateCalls.filter((c) => c.table === 'assignments')).toHaveLength(0);
    expect(updateCalls.filter((c) => c.table === 'planned_assignments')).toHaveLength(0);
  });

  it('500s and logs when the RPC errors', async () => {
    setTable('lesson_plan_decks', { data: [{ deck_id: 'd1', position: 0 }] });
    rpcMock.mockResolvedValue({ data: null, error: { message: 'boom' } });

    const res = await call({ shift: { fromDeckId: 'd1', days: 7 } });
    expect(res.status).toBe(500);
  });
});
