import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { _resetStore } from '@/app/api/_lib/rateLimit';
import type * as HandoutWritesModule from '@/app/api/group/_lib/handoutWrites';

const {
  requireGroupAccessMock,
  assignHandoutMock,
  assignCompanionKanaMock,
  generateDeckSentencesMock,
  memberIdsForMock,
} = vi.hoisted(() => ({
  requireGroupAccessMock: vi.fn(),
  assignHandoutMock: vi.fn(),
  assignCompanionKanaMock: vi.fn(),
  generateDeckSentencesMock: vi.fn(),
  memberIdsForMock: vi.fn(),
}));

vi.mock('@/app/api/group/_lib/requireGroupAccess', () => ({
  requireGroupAccess: (...args: unknown[]) => requireGroupAccessMock(...args),
}));
vi.mock('@/app/api/group/_lib/assignCompanionKana', () => ({
  assignCompanionKana: (...args: unknown[]) => assignCompanionKanaMock(...args),
}));
vi.mock('@/app/api/group/_lib/generateDeckSentences', () => ({
  generateDeckSentences: (...args: unknown[]) => generateDeckSentencesMock(...args),
}));
vi.mock('@/app/api/group/_lib/membership', () => ({
  memberIdsFor: (...args: unknown[]) => memberIdsForMock(...args),
}));
vi.mock('@/app/api/group/_lib/handoutWrites', async (importOriginal) => {
  const actual = await importOriginal<typeof HandoutWritesModule>();
  return { ...actual, assignHandout: (...args: unknown[]) => assignHandoutMock(...args) };
});

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
const deleteCalls: string[] = [];

function makeChain(table: string) {
  const eqs: [string, unknown][] = [];
  const ins: [string, unknown[]][] = [];
  const resolve = () => {
    const stored = tableData[table];
    if (!stored || !stored.rows) {
      return { data: null, error: null, count: 0, ...(stored ?? {}) };
    }
    let rows = stored.rows;
    for (const [col, val] of eqs) rows = rows.filter((r) => r[col] === val);
    for (const [col, vals] of ins) rows = rows.filter((r) => vals.includes(r[col]));
    return { data: rows, error: null, count: rows.length };
  };
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn((col: string, val: unknown) => {
    eqs.push([col, val]);
    return chain;
  });
  chain.in = vi.fn((col: string, vals: unknown[]) => {
    ins.push([col, vals]);
    return chain;
  });
  chain.order = vi.fn(() => chain);
  chain.update = vi.fn((updates: unknown) => {
    updateCalls.push({ table, updates });
    return chain;
  });
  chain.delete = vi.fn(() => {
    deleteCalls.push(table);
    return chain;
  });
  chain.maybeSingle = vi.fn(() => {
    const stored = tableData[table];
    if (!stored?.rows) return Promise.resolve(resolve());
    const result = resolve();
    const rows = (result.data as unknown[]) ?? [];
    return Promise.resolve({ ...result, data: rows[0] ?? null });
  });
  chain.then = (onfulfilled: (v: unknown) => unknown, onrejected?: (e: unknown) => unknown) =>
    Promise.resolve(resolve()).then(onfulfilled, onrejected);
  return chain;
}

vi.mock('@/app/api/group/_lib/serviceSupabase', () => ({
  getServiceSupabase: () => ({ from: (table: string) => makeChain(table) }),
}));

import { DELETE, PATCH, POST } from '@/app/api/group/lessons/handout/route';

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

function postRequest(body: unknown) {
  return new NextRequest('http://localhost/api/group/lessons/handout', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/group/lessons/handout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetStore();
    updateCalls.length = 0;
    deleteCalls.length = 0;
    for (const key of Object.keys(tableData)) delete tableData[key];
    requireGroupAccessMock.mockResolvedValue(ACCESS);
    setTable('decks', { data: { id: 'd1', name: 'Food' } });
    setTable('lesson_plan_decks', {
      rows: [{ plan_id: 'plan1', deck_id: 'd1', kana_sets: ['hira-a'] }],
    });
    setTable('lesson_plans', { rows: [{ id: 'plan1', organizer_id: 'org1', group_id: 'g1' }] });
    assignHandoutMock.mockResolvedValue({ error: null });
    memberIdsForMock.mockResolvedValue(['m1', 'm2', 'm3']);
    assignCompanionKanaMock.mockResolvedValue({ assigned: ['hira-a'], failed: [] });
  });

  it('400s when groupId or deckId is missing', async () => {
    const res = await POST(postRequest({ deckId: 'd1' }));
    expect(res.status).toBe(400);
  });

  it('404s when the deck does not belong to the organizer', async () => {
    setTable('decks', { data: null });
    const res = await POST(postRequest({ groupId: 'g1', deckId: 'd1', dueDate: '2026-10-20' }));
    expect(res.status).toBe(404);
  });

  it('404s when the deck is not linked to a lesson', async () => {
    setTable('lesson_plan_decks', { rows: [] });
    const res = await POST(postRequest({ groupId: 'g1', deckId: 'd1', dueDate: '2026-10-20' }));
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
    const res = await POST(
      postRequest({ groupId: 'g1', deckId: 'd1', dueDate: '2026-10-20', availableOn: null }),
    );
    expect(res.status).toBe(200);
    expect(assignCompanionKanaMock).toHaveBeenCalledWith(
      expect.objectContaining({ rows: [{ setId: 'hira-a', dueDate: '2026-10-20' }] }),
    );
  });

  it('400s when availableOn is after dueDate', async () => {
    const res = await POST(
      postRequest({
        groupId: 'g1',
        deckId: 'd1',
        dueDate: '2026-10-13',
        availableOn: '2026-10-20',
      }),
    );
    expect(res.status).toBe(400);
  });

  it('409s when the lesson has already been handed out', async () => {
    setTable('planned_assignments', { count: 1 });
    const res = await POST(postRequest({ groupId: 'g1', deckId: 'd1', dueDate: '2026-10-20' }));
    expect(res.status).toBe(409);
    expect(assignHandoutMock).not.toHaveBeenCalled();
  });

  it('creates member assignment rows and the sound rows on the happy path', async () => {
    const res = await POST(
      postRequest({
        groupId: 'g1',
        deckId: 'd1',
        dueDate: '2026-10-20',
        availableOn: '2026-10-13',
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      assigned: 3,
      kanaAssigned: ['hira-a'],
      kanaFailed: [],
      sentences: undefined,
    });
    expect(assignHandoutMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ deckId: 'd1', dueDate: '2026-10-20', availableOn: '2026-10-13' }),
    );
    expect(assignCompanionKanaMock).toHaveBeenCalledWith(
      expect.objectContaining({ rows: [{ setId: 'hira-a', dueDate: '2026-10-20' }] }),
    );
  });

  it('does not fail the request when sentence generation fails', async () => {
    generateDeckSentencesMock.mockResolvedValue({ status: 'failed', error: 'no cards' });
    const originalKey = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = 'test-key';
    const res = await POST(
      postRequest({ groupId: 'g1', deckId: 'd1', dueDate: '2026-10-20', withSentences: true }),
    );
    process.env.GEMINI_API_KEY = originalKey;
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sentences).toBe('failed');
    expect(generateDeckSentencesMock).toHaveBeenCalled();
  });

  it('reports sentences ok when generation succeeds', async () => {
    generateDeckSentencesMock.mockResolvedValue({ status: 'generated' });
    const originalKey = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = 'test-key';
    const res = await POST(
      postRequest({ groupId: 'g1', deckId: 'd1', dueDate: '2026-10-20', withSentences: true }),
    );
    process.env.GEMINI_API_KEY = originalKey;
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sentences).toBe('ok');
  });
});
