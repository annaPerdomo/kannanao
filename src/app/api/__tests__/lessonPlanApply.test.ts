import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { _resetStore } from '@/app/api/_lib/rateLimit';
import { _resetLessonBudget } from '@/app/api/group/_lib/lessonBudget';
import type { LessonPlan } from '@/types/lessonPlan';

vi.mock('@/app/api/_lib/requireOrganizerAccount', () => ({
  requireOrganizerAccount: vi.fn().mockResolvedValue({
    id: 'org1',
    username: 'organizer',
    account_type: 'organizer',
  }),
}));

// Sentence generation is covered by practiceSentencesBatch.test.ts.
vi.mock('@/app/api/group/_lib/generateDeckSentences', () => ({
  generateDeckSentences: vi
    .fn()
    .mockResolvedValue({ status: 'generated', sentences: [], deckWords: [] }),
}));

type QueryResult = { data?: unknown; error?: { message: string } | null };

let reads: Record<string, QueryResult[]> = {};
let insertReturns: Record<string, QueryResult[]> = {};
let inserted: { table: string; rows: Record<string, unknown>[] }[] = [];

function nextRead(table: string): QueryResult {
  return reads[table]?.shift() ?? { data: null, error: null };
}

function nextInsertResult(table: string): QueryResult {
  return insertReturns[table]?.shift() ?? { data: null, error: null };
}

vi.mock('@/app/api/group/_lib/serviceSupabase', () => ({
  getServiceSupabase: () => ({
    from(table: string) {
      const afterInsert = {
        select: () => afterInsert,
        single: () => Promise.resolve(nextInsertResult(table)),
        then: (ok: (r: QueryResult) => unknown, err?: (e: unknown) => unknown) =>
          Promise.resolve(nextInsertResult(table)).then(ok, err),
      };
      const chain = {
        select: () => chain,
        eq: () => chain,
        gt: () => chain,
        in: () => chain,
        limit: () => chain,
        order: () => chain,
        single: () => Promise.resolve(nextRead(table)),
        maybeSingle: () => Promise.resolve(nextRead(table)),
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

import { POST } from '@/app/api/group/lesson-plan/apply/route';

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/group/lesson-plan/apply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function planWith(names: string[]): LessonPlan {
  return {
    decks: names.map((name) => ({
      name,
      description: `${name} description`,
      emoji: '📘',
      mainViewMode: 'hiragana' as const,
      cards: [
        {
          word: 'ねこ',
          reading: 'ねこ',
          meaning: 'cat',
          exampleJp: 'ねこがいます',
          exampleEn: 'There is a cat',
          jlptLevel: 'N5',
        },
      ],
    })),
  };
}

/** groups lookup (requireGroupAccess) → member lookup → highest deck position. */
function seedAccess() {
  reads.groups.push({ data: { id: 'g1', organizer_id: 'org1' }, error: null });
  reads.profiles.push({ data: { id: 'm1' }, error: null });
  reads.decks.push({ data: { position: 4 }, error: null });
}

function rowsFor(table: string) {
  return inserted.filter((i) => i.table === table).flatMap((i) => i.rows);
}

const BASE = { groupId: 'g1', memberId: 'm1', firstDueDate: '2026-08-09' };

beforeEach(() => {
  vi.clearAllMocks();
  _resetStore();
  _resetLessonBudget();
  process.env.GEMINI_API_KEY = 'test-gemini-key';
  reads = { groups: [], profiles: [], decks: [], cards: [], assignments: [], card_progress: [] };
  insertReturns = { decks: [], cards: [], assignments: [] };
  inserted = [];
});

describe('POST /api/group/lesson-plan/apply', () => {
  it('rejects a plan with no decks', async () => {
    seedAccess();
    const res = await POST(makeRequest({ ...BASE, plan: { decks: [] } }));
    expect(res.status).toBe(400);
  });

  it('rejects an invalid first due date', async () => {
    seedAccess();
    const res = await POST(
      makeRequest({ ...BASE, firstDueDate: 'someday', plan: planWith(['Week 1']) }),
    );
    expect(res.status).toBe(400);
  });

  it('creates decks, cards and assignments a week apart', async () => {
    seedAccess();
    insertReturns.decks.push({ data: { id: 'd1' } }, { data: { id: 'd2' } });

    const res = await POST(makeRequest({ ...BASE, plan: planWith(['Food', 'Counting']) }));
    expect(res.status).toBe(200);

    const { results } = await res.json();
    expect(results.map((r: { status: string }) => r.status)).toEqual(['created', 'created']);

    const decks = rowsFor('decks');
    expect(decks[0]).toMatchObject({ user_id: 'org1', name: 'Food', position: 5 });
    expect(decks[1]).toMatchObject({ name: 'Counting', position: 6 });

    expect(rowsFor('cards')[0]).toMatchObject({ deck_id: 'd1', word: 'ねこ', image_query: '' });

    const assignments = rowsFor('assignments');
    expect(assignments[0]).toMatchObject({
      member_id: 'm1',
      group_id: 'g1',
      deck_id: 'd1',
      due_date: '2026-08-09',
    });
    expect(assignments[1]).toMatchObject({ deck_id: 'd2', due_date: '2026-08-16' });
    expect(assignments[0].title).toContain('Week 1');
  });

  it('reports a deck whose cards failed and still creates the rest', async () => {
    seedAccess();
    insertReturns.decks.push({ data: { id: 'd1' } }, { data: { id: 'd2' } });
    insertReturns.cards.push({ error: { message: 'insert blew up' } }, { error: null });

    const res = await POST(makeRequest({ ...BASE, plan: planWith(['Food', 'Counting']) }));
    expect(res.status).toBe(200);

    const { results } = await res.json();
    expect(results[0]).toMatchObject({ name: 'Food', status: 'failed', deckId: 'd1' });
    expect(results[0].error).toBeTruthy();
    expect(results[1]).toMatchObject({ name: 'Counting', status: 'created' });
  });

  it('rejects a learner outside the caller’s group', async () => {
    reads.groups.push({ data: { id: 'g1', organizer_id: 'org1' }, error: null });
    reads.profiles.push({ data: null, error: null });

    const res = await POST(makeRequest({ ...BASE, plan: planWith(['Food']) }));
    expect(res.status).toBe(403);
  });
});
