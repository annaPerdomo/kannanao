import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { _resetStore } from '@/app/api/_lib/rateLimit';

const { requireGroupAccessMock } = vi.hoisted(() => ({
  requireGroupAccessMock: vi.fn(),
}));

vi.mock('@/app/api/group/_lib/requireGroupAccess', () => ({
  requireGroupAccess: (...args: unknown[]) => requireGroupAccessMock(...args),
}));

interface TableResult {
  data?: unknown;
  error?: unknown;
  count?: number;
}

const tableData: Record<string, TableResult> = {};
function setTable(table: string, result: TableResult) {
  tableData[table] = result;
}
const updateCalls: { table: string; updates: unknown }[] = [];
const deleteCalls: string[] = [];

function makeChain(table: string) {
  const asPromise = () =>
    Promise.resolve({ data: null, error: null, count: 0, ...(tableData[table] ?? {}) });
  const chain: Record<string, unknown> = {};
  ['select', 'eq', 'in', 'order'].forEach((m) => {
    chain[m] = vi.fn(() => chain);
  });
  chain.update = vi.fn((updates: unknown) => {
    updateCalls.push({ table, updates });
    return chain;
  });
  chain.delete = vi.fn(() => {
    deleteCalls.push(table);
    return chain;
  });
  chain.then = (onfulfilled: (v: unknown) => unknown, onrejected?: (e: unknown) => unknown) =>
    asPromise().then(onfulfilled, onrejected);
  return chain;
}

vi.mock('@/app/api/group/_lib/serviceSupabase', () => ({
  getServiceSupabase: () => ({ from: (table: string) => makeChain(table) }),
}));

import { DELETE, PATCH } from '@/app/api/group/lessons/handout/route';

const ACCESS = {
  organizer: { id: 'org1', username: 'teacher', account_type: 'organizer' },
  group: { id: 'g1' },
};

function patchRequest(body: unknown) {
  return new NextRequest('http://localhost/api/group/lessons/handout', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function deleteRequest(query: string) {
  return new NextRequest(`http://localhost/api/group/lessons/handout?${query}`, {
    method: 'DELETE',
  });
}

describe('PATCH /api/group/lessons/handout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetStore();
    updateCalls.length = 0;
    deleteCalls.length = 0;
    for (const key of Object.keys(tableData)) delete tableData[key];
    requireGroupAccessMock.mockResolvedValue(ACCESS);
    setTable('planned_assignments', { count: 1 });
    setTable('assignments', { count: 3 });
  });

  it('400s on an invalid body', async () => {
    const res = await PATCH(
      new NextRequest('http://localhost/api/group/lessons/handout', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: 'not json',
      }),
    );
    expect(res.status).toBe(400);
  });

  it('400s when groupId or deckId is missing', async () => {
    const res = await PATCH(patchRequest({ deckId: 'd1' }));
    expect(res.status).toBe(400);
  });

  it('passes through a non-200 from requireGroupAccess', async () => {
    requireGroupAccessMock.mockResolvedValue(
      NextResponse.json({ error: 'Group not found.' }, { status: 404 }),
    );
    const res = await PATCH(patchRequest({ groupId: 'g1', deckId: 'd1', title: 'X' }));
    expect(res.status).toBe(404);
  });

  it('400s on an invalid patch field', async () => {
    const res = await PATCH(patchRequest({ groupId: 'g1', deckId: 'd1', requiredAccuracy: 150 }));
    expect(res.status).toBe(400);
  });

  it('400s when availableOn is set after dueDate', async () => {
    const res = await PATCH(
      patchRequest({
        groupId: 'g1',
        deckId: 'd1',
        availableOn: '2026-10-20',
        dueDate: '2026-10-13',
      }),
    );
    expect(res.status).toBe(400);
  });

  it('404s when the deck has neither a template nor an assignment', async () => {
    setTable('planned_assignments', { count: 0 });
    setTable('assignments', { count: 0 });
    const res = await PATCH(patchRequest({ groupId: 'g1', deckId: 'd1', title: 'X' }));
    expect(res.status).toBe(404);
  });

  it('updates both assignments and planned_assignments on the happy path', async () => {
    const res = await PATCH(
      patchRequest({ groupId: 'g1', deckId: 'd1', title: '  New title  ', dueDate: '2026-10-20' }),
    );
    expect(res.status).toBe(200);
    const tables = updateCalls.map((c) => c.table);
    expect(tables).toEqual(expect.arrayContaining(['assignments', 'planned_assignments']));
    for (const call of updateCalls) {
      expect(call.updates).toMatchObject({ title: 'New title', due_date: '2026-10-20' });
    }
  });
});

describe('DELETE /api/group/lessons/handout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetStore();
    updateCalls.length = 0;
    deleteCalls.length = 0;
    for (const key of Object.keys(tableData)) delete tableData[key];
    requireGroupAccessMock.mockResolvedValue(ACCESS);
    setTable('lesson_plans', { data: [] });
  });

  it('400s when groupId or deckId is missing', async () => {
    const res = await DELETE(deleteRequest('groupId=g1'));
    expect(res.status).toBe(400);
  });

  it('passes through a non-200 from requireGroupAccess', async () => {
    requireGroupAccessMock.mockResolvedValue(
      NextResponse.json({ error: 'Group not found.' }, { status: 404 }),
    );
    const res = await DELETE(deleteRequest('groupId=g1&deckId=d1'));
    expect(res.status).toBe(404);
  });

  it('deletes the handout everywhere and returns ok', async () => {
    const res = await DELETE(deleteRequest('groupId=g1&deckId=d1'));
    expect(res.status).toBe(200);
    expect(deleteCalls).toEqual(expect.arrayContaining(['assignments', 'planned_assignments']));
    expect(deleteCalls).not.toContain('decks');
    expect(deleteCalls).not.toContain('cards');
  });
});
