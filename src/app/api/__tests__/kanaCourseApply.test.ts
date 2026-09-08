import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { _resetStore } from '@/app/api/_lib/rateLimit';

vi.mock('@/app/api/_lib/requireOrganizerAccount', () => ({
  requireOrganizerAccount: vi.fn().mockResolvedValue({
    id: 'org1',
    username: 'organizer',
    account_type: 'organizer',
  }),
}));

type QueryResult = { data?: unknown; error?: { message: string } | null };

let reads: Record<string, QueryResult[]> = {};
let insertReturns: Record<string, QueryResult[]> = {};
let inserted: { table: string; rows: Record<string, unknown>[] }[] = [];

function nextRead(table: string): QueryResult {
  return reads[table]?.shift() ?? { data: null, error: null };
}

function nextInsertResult(table: string): QueryResult {
  return insertReturns[table]?.shift() ?? { data: [], error: null };
}

vi.mock('@/app/api/group/_lib/serviceSupabase', () => ({
  getServiceSupabase: () => ({
    from(table: string) {
      const afterInsert = {
        select: () => afterInsert,
        then: (ok: (r: QueryResult) => unknown, err?: (e: unknown) => unknown) =>
          Promise.resolve(nextInsertResult(table)).then(ok, err),
      };
      const chain = {
        select: () => chain,
        eq: () => chain,
        in: () => chain,
        order: () => chain,
        limit: () => chain,
        single: () => Promise.resolve(nextRead(table)),
        insert: (rows: Record<string, unknown> | Record<string, unknown>[]) => {
          inserted.push({ table, rows: Array.isArray(rows) ? rows : [rows] });
          return afterInsert;
        },
        then: (ok: (r: QueryResult) => unknown, err?: (e: unknown) => unknown) =>
          Promise.resolve(nextRead(table)).then(ok, err),
      };
      return chain;
    },
  }),
}));

import { POST } from '@/app/api/group/kana-course/apply/route';

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/group/kana-course/apply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function seedAccess(memberIds: string[] = ['m1', 'm2']) {
  reads.groups.push({ data: { id: 'g1', organizer_id: 'org1' }, error: null });
  reads.group_members.push({ data: memberIds.map((id) => ({ member_id: id })), error: null });
}

function rowsFor(table: string) {
  return inserted.filter((i) => i.table === table).flatMap((i) => i.rows);
}

const WEEKS = [
  { dueDate: '2026-09-07', setIds: ['hira-a'] },
  { dueDate: '2026-09-14', setIds: ['hira-ka'] },
];

beforeEach(() => {
  vi.clearAllMocks();
  _resetStore();
  reads = { groups: [], group_members: [], assignments: [] };
  insertReturns = { assignments: [] };
  inserted = [];
});

describe('POST /api/group/kana-course/apply', () => {
  it('rejects a request with no groupId', async () => {
    const res = await POST(makeRequest({ weeks: WEEKS }));
    expect(res.status).toBe(400);
  });

  it('rejects an empty or malformed weeks array', async () => {
    seedAccess();
    const res = await POST(makeRequest({ groupId: 'g1', weeks: [] }));
    expect(res.status).toBe(400);
  });

  it('rejects a set id that is not in the curriculum', async () => {
    seedAccess();
    const res = await POST(
      makeRequest({ groupId: 'g1', weeks: [{ dueDate: '2026-09-07', setIds: ['nope'] }] }),
    );
    expect(res.status).toBe(400);
  });

  it('writes one row per member per week, with that week own due date', async () => {
    seedAccess(['m1', 'm2']);
    insertReturns.assignments.push({ data: [{ id: 'a1' }, { id: 'a2' }], error: null });
    insertReturns.assignments.push({ data: [{ id: 'a3' }, { id: 'a4' }], error: null });

    const res = await POST(makeRequest({ groupId: 'g1', weeks: WEEKS }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.assigned.sort()).toEqual(['hira-a', 'hira-ka']);
    expect(body.failed).toEqual([]);
    expect(body.memberCount).toBe(2);

    const rows = rowsFor('assignments');
    expect(rows).toHaveLength(4);
    expect(
      rows.filter((r) => r.kana_set === 'hira-a').every((r) => r.due_date === '2026-09-07'),
    ).toBe(true);
    expect(
      rows.filter((r) => r.kana_set === 'hira-ka').every((r) => r.due_date === '2026-09-14'),
    ).toBe(true);
  });

  it('refuses a course for a group nobody has joined yet', async () => {
    seedAccess([]);
    const res = await POST(makeRequest({ groupId: 'g1', weeks: WEEKS }));
    expect(res.status).toBe(409);
    expect(rowsFor('assignments')).toHaveLength(0);
  });

  it('gives a row that appears twice its earliest week, whatever the order', async () => {
    seedAccess(['m1']);
    insertReturns.assignments.push({ data: [{ id: 'a1' }], error: null });

    const res = await POST(
      makeRequest({
        groupId: 'g1',
        weeks: [
          { dueDate: '2026-10-05', setIds: ['hira-a'] },
          { dueDate: '2026-09-07', setIds: ['hira-a'] },
        ],
      }),
    );
    expect(res.status).toBe(200);
    expect(rowsFor('assignments').map((r) => r.due_date)).toEqual(['2026-09-07']);
  });

  it('refuses a course bigger than one function invocation can write', async () => {
    seedAccess();
    const weeks = Array.from({ length: 20 }, (_, i) => ({
      dueDate: '2026-09-07',
      setIds: ['hira-a'],
      week: i,
    }));
    const res = await POST(makeRequest({ groupId: 'g1', weeks }));
    expect(res.status).toBe(400);
  });

  it('is idempotent: a retry leaves an already-assigned row untouched', async () => {
    seedAccess(['m1']);
    // The find-existing read reports m1 already has hira-a.
    reads.assignments.push({ data: [{ member_id: 'm1' }], error: null });

    const res = await POST(
      makeRequest({ groupId: 'g1', weeks: [{ dueDate: '2026-09-07', setIds: ['hira-a'] }] }),
    );
    const body = await res.json();
    expect(body.assigned).toEqual(['hira-a']);
    expect(rowsFor('assignments')).toHaveLength(0);
  });

  it('keeps the earliest due date when a row appears in more than one week', async () => {
    seedAccess(['m1']);
    insertReturns.assignments.push({ data: [{ id: 'a1' }], error: null });

    const res = await POST(
      makeRequest({
        groupId: 'g1',
        weeks: [
          { dueDate: '2026-09-07', setIds: ['hira-a'] },
          { dueDate: '2026-09-14', setIds: ['hira-a'] },
        ],
      }),
    );
    expect(res.status).toBe(200);
    expect(rowsFor('assignments')).toHaveLength(1);
    expect(rowsFor('assignments')[0].due_date).toBe('2026-09-07');
  });

  it('reports a failed row without failing the whole request', async () => {
    seedAccess(['m1']);
    insertReturns.assignments.push({ data: null, error: { message: 'nope' } });

    const res = await POST(
      makeRequest({ groupId: 'g1', weeks: [{ dueDate: '2026-09-07', setIds: ['hira-a'] }] }),
    );
    const body = await res.json();
    expect(body.assigned).toEqual([]);
    expect(body.failed).toEqual(['hira-a']);
  });
});
