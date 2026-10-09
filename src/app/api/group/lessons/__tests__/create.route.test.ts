import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { _resetStore } from '@/app/api/_lib/rateLimit';

const { requireGroupAccessMock } = vi.hoisted(() => ({
  requireGroupAccessMock: vi.fn(),
}));

vi.mock('@/app/api/group/_lib/requireGroupAccess', () => ({
  requireGroupAccess: (...args: unknown[]) => requireGroupAccessMock(...args),
}));

interface Result {
  data?: unknown;
  error?: unknown;
}

const queues: Record<string, Result[]> = {};
function queue(table: string, ...results: Result[]) {
  queues[table] = [...results];
}
function takeResult(table: string): Result {
  const q = queues[table];
  if (!q || q.length === 0) return { data: null, error: null };
  if (q.length === 1) return q[0];
  return q.shift() as Result;
}

const deleteCalls: { table: string }[] = [];
const insertCalls: { table: string; rows: unknown }[] = [];
const updateCalls: { table: string; updates: unknown }[] = [];

function makeChain(table: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: Record<string, any> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  chain.limit = vi.fn(() => chain);
  chain.insert = vi.fn((rows: unknown) => {
    insertCalls.push({ table, rows });
    return chain;
  });
  chain.update = vi.fn((updates: unknown) => {
    updateCalls.push({ table, updates });
    return chain;
  });
  chain.delete = vi.fn(() => {
    deleteCalls.push({ table });
    return chain;
  });
  chain.single = vi.fn(() => Promise.resolve(takeResult(table)));
  chain.maybeSingle = vi.fn(() => Promise.resolve(takeResult(table)));
  chain.then = (onf: (v: unknown) => unknown, onr?: (e: unknown) => unknown) =>
    Promise.resolve(takeResult(table)).then(onf, onr);
  return chain;
}

vi.mock('@/app/api/group/_lib/serviceSupabase', () => ({
  getServiceSupabase: () => ({ from: (table: string) => makeChain(table) }),
}));

import { POST } from '@/app/api/group/lessons/route';

const ORGANIZER = { id: 'org1', username: 'teacher', account_type: 'organizer' };
const ACCESS = { organizer: ORGANIZER, group: { id: 'g1' } };

function request(body: unknown) {
  return new NextRequest('http://localhost/api/group/lessons', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/group/lessons', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetStore();
    for (const key of Object.keys(queues)) delete queues[key];
    deleteCalls.length = 0;
    insertCalls.length = 0;
    updateCalls.length = 0;
    requireGroupAccessMock.mockResolvedValue(ACCESS);
    vi.stubGlobal('crypto', { randomUUID: () => 'new-plan-id' });
  });

  it('400s when title is missing', async () => {
    const res = await POST(request({ groupId: 'g1', unit: { title: null } }));
    expect(res.status).toBe(400);
  });

  it('400s when kanaSets has an unknown id', async () => {
    const res = await POST(
      request({ groupId: 'g1', title: 'Food', unit: { title: null }, kanaSets: ['not-a-set'] }),
    );
    expect(res.status).toBe(400);
  });

  it('creates a new unit when unit.title is given', async () => {
    queue('decks', { data: null, error: null }, { data: { id: 'd1' }, error: null });
    queue('lesson_plan_decks', { data: [], error: null }, { error: null });

    const res = await POST(request({ groupId: 'g1', title: 'Food', unit: { title: 'Unit 1' } }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toEqual({ planId: 'new-plan-id', deckId: 'd1' });
    expect(insertCalls.some((c) => c.table === 'lesson_plans')).toBe(true);
  });

  it('adds a lesson to an existing unit when unit.planId is given', async () => {
    queue('lesson_plans', { data: { id: 'plan1' }, error: null });
    queue('decks', { data: null, error: null }, { data: { id: 'd2' }, error: null });
    queue('lesson_plan_decks', { data: [{ position: 0 }], error: null }, { error: null });

    const res = await POST(request({ groupId: 'g1', title: 'Travel', unit: { planId: 'plan1' } }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toEqual({ planId: 'plan1', deckId: 'd2' });
  });

  it('404s when unit.planId does not belong to this organizer or group', async () => {
    queue('lesson_plans', { data: null, error: null });
    const res = await POST(request({ groupId: 'g1', title: 'Travel', unit: { planId: 'nope' } }));
    expect(res.status).toBe(404);
  });

  it('rolls back the deck when linking to the unit fails', async () => {
    queue('decks', { data: null, error: null }, { data: { id: 'd3' }, error: null });
    queue(
      'lesson_plan_decks',
      { data: [], error: null },
      { error: { message: 'boom', code: '23505' } },
    );

    const res = await POST(request({ groupId: 'g1', title: 'Food', unit: { title: 'Unit 1' } }));
    expect(res.status).toBe(500);
    expect(deleteCalls.some((c) => c.table === 'decks')).toBe(true);
    expect(deleteCalls.some((c) => c.table === 'lesson_plans')).toBe(true);
  });

  it('saves validated kana sets on the new lesson plan deck', async () => {
    queue('decks', { data: null, error: null }, { data: { id: 'd4' }, error: null });
    queue('lesson_plan_decks', { data: [], error: null }, { error: null }, { error: null });

    const res = await POST(
      request({
        groupId: 'g1',
        title: 'Food',
        unit: { title: 'Unit 1' },
        kanaSets: ['hira-ka', 'hira-a'],
      }),
    );
    expect(res.status).toBe(201);
    const kanaUpdate = updateCalls.find((c) => c.table === 'lesson_plan_decks');
    expect(kanaUpdate?.updates).toEqual({ kana_sets: ['hira-a', 'hira-ka'] });
  });

  it('passes through a 404 from requireGroupAccess', async () => {
    requireGroupAccessMock.mockResolvedValue(
      NextResponse.json({ error: 'Group not found.' }, { status: 404 }),
    );
    const res = await POST(request({ groupId: 'g1', title: 'Food', unit: { title: null } }));
    expect(res.status).toBe(404);
  });
});
