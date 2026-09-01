import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { _resetStore } from '@/app/api/_lib/rateLimit';
import type { LessonPlan } from '@/types/lessonPlan';

vi.mock('@/app/api/_lib/requireOrganizerAccount', () => ({
  requireOrganizerAccount: vi.fn().mockResolvedValue({
    id: 'org1',
    username: 'organizer',
    account_type: 'organizer',
  }),
}));

// Sentence generation itself is covered by generateDeckSentences.test.ts; here
// what matters is whether it runs and which set it is asked to write.
const { generateDeckSentencesMock } = vi.hoisted(() => ({
  generateDeckSentencesMock: vi
    .fn()
    .mockResolvedValue({ status: 'generated', sentences: [], deckWords: [] }),
}));

vi.mock('@/app/api/group/_lib/generateDeckSentences', () => ({
  generateDeckSentences: (...args: unknown[]) => generateDeckSentencesMock(...args),
}));

type QueryResult = { data?: unknown; error?: { message: string } | null };

let reads: Record<string, QueryResult[]> = {};
let insertReturns: Record<string, QueryResult[]> = {};
let inserted: { table: string; rows: Record<string, unknown>[] }[] = [];
let updated: { table: string; patch: Record<string, unknown> }[] = [];

function nextRead(table: string): QueryResult {
  return reads[table]?.shift() ?? { data: null, error: null };
}

function nextInsertResult(table: string): QueryResult {
  return insertReturns[table]?.shift() ?? { data: null, error: null };
}

vi.mock('@/app/api/group/_lib/serviceSupabase', () => ({
  getServiceSupabase: () => ({
    // Budget is claimed by an RPC; the counter itself has its own test.
    rpc: () => Promise.resolve({ data: 1, error: null }),
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
        update: (patch: Record<string, unknown>) => {
          updated.push({ table, patch });
          const afterUpdate = {
            eq: () => afterUpdate,
            in: () => afterUpdate,
            select: () => afterUpdate,
            then: (ok: (r: QueryResult) => unknown, err?: (e: unknown) => unknown) =>
              Promise.resolve(nextInsertResult(table)).then(ok, err),
          };
          return afterUpdate;
        },
        upsert: (rows: Record<string, unknown> | Record<string, unknown>[]) => {
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

/** groups lookup (requireGroupAccess) → group roster → highest deck position. */
function seedAccess(memberIds: string[] = ['m1']) {
  reads.groups.push({ data: { id: 'g1', organizer_id: 'org1' }, error: null });
  reads.group_members.push({ data: memberIds.map((id) => ({ member_id: id })), error: null });
  reads.decks.push({ data: { position: 4 }, error: null });
}

function rowsFor(table: string) {
  return inserted.filter((i) => i.table === table).flatMap((i) => i.rows);
}

const BASE = { groupId: 'g1', firstDueDate: '2026-08-09' };

beforeEach(() => {
  vi.clearAllMocks();
  _resetStore();
  process.env.GEMINI_API_KEY = 'test-gemini-key';
  reads = {
    groups: [],
    group_members: [],
    decks: [],
    cards: [],
    assignments: [],
    card_progress: [],
  };
  insertReturns = { decks: [], cards: [], assignments: [] };
  inserted = [];
  updated = [];
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

  it('assigns the companion kana rows alongside the decks', async () => {
    seedAccess(['m1', 'm2']);
    insertReturns.decks.push({ data: { id: 'd1' } });

    const res = await POST(
      makeRequest({ ...BASE, plan: planWith(['Food']), kanaSets: ['hira-ra', 'hira-ra'] }),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).kanaAssigned).toEqual(['hira-ra']);

    const kana = rowsFor('assignments').filter((r) => r.kana_set);
    expect(kana).toHaveLength(2);
    expect(kana[0]).toMatchObject({
      member_id: 'm1',
      group_id: 'g1',
      deck_id: null,
      kana_set: 'hira-ra',
      due_date: '2026-08-09',
      available_on: null,
    });
  });

  it('leaves the kana rows alone when the organizer unticked them', async () => {
    seedAccess();
    insertReturns.decks.push({ data: { id: 'd1' } });

    const res = await POST(makeRequest({ ...BASE, plan: planWith(['Food']) }));
    expect((await res.json()).kanaAssigned).toEqual([]);
    expect(rowsFor('assignments').filter((r) => r.kana_set)).toHaveLength(0);
  });

  it('never rewrites a kana row the organizer already assigned', async () => {
    seedAccess();
    insertReturns.decks.push({ data: { id: 'd1' } });
    reads.assignments.push({ data: [{ member_id: 'm1' }], error: null });

    const res = await POST(
      makeRequest({ ...BASE, plan: planWith(['Food']), kanaSets: ['hira-ra'] }),
    );
    expect((await res.json()).kanaAssigned).toEqual(['hira-ra']);
    expect(rowsFor('assignments').filter((r) => r.kana_set)).toHaveLength(0);
    expect(updated.filter((u) => u.table === 'assignments')).toHaveLength(0);
  });

  it('skips the kana rows when every deck failed', async () => {
    seedAccess();
    insertReturns.decks.push({ data: null, error: { message: 'nope' } });

    const res = await POST(
      makeRequest({ ...BASE, plan: planWith(['Food']), kanaSets: ['hira-ra'] }),
    );
    expect((await res.json()).kanaAssigned).toEqual([]);
    expect(rowsFor('assignments').filter((r) => r.kana_set)).toHaveLength(0);
  });

  it('reports the kana rows that could not be assigned', async () => {
    seedAccess();
    insertReturns.decks.push({ data: { id: 'd1' } });
    // The deck's own assignment writes first; the kana row is the second write.
    insertReturns.assignments.push({ data: [], error: null });
    insertReturns.assignments.push({ data: null, error: { message: 'nope' } });

    const res = await POST(
      makeRequest({ ...BASE, plan: planWith(['Food']), kanaSets: ['hira-ra'] }),
    );
    const body = await res.json();
    expect(body.kanaAssigned).toEqual([]);
    expect(body.kanaFailed).toEqual(['hira-ra']);
  });

  it('rejects a kana row that is not in the curriculum', async () => {
    seedAccess();
    const res = await POST(
      makeRequest({ ...BASE, plan: planWith(['Food']), kanaSets: ['hira-nope'] }),
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

  it('carries the image query and URL through when the plan card has them', async () => {
    seedAccess();
    insertReturns.decks.push({ data: { id: 'd1' } });

    const plan = planWith(['Food']);
    plan.decks[0].cards[0].imageQuery = 'sleeping cat';
    plan.decks[0].cards[0].imageUrl = 'https://images.example/cat.jpg';

    const res = await POST(makeRequest({ ...BASE, plan }));
    expect(res.status).toBe(200);

    expect(rowsFor('cards')[0]).toMatchObject({
      image_query: 'sleeping cat',
      image_url: 'https://images.example/cat.jpg',
    });
  });

  it('resumes a part-finished plan by name, not by position', async () => {
    // Run 1 created Food and Counting but died on Kana in between. Matched by
    // array position, Counting's deck would be reported as Kana.
    reads.decks.push({
      data: [
        { id: 'd1', name: 'Food', card_count: 1 },
        { id: 'd3', name: 'Counting', card_count: 1 },
      ],
      error: null,
    });
    seedAccess();
    insertReturns.decks.push({ data: { id: 'd2' } });

    const res = await POST(
      makeRequest({
        ...BASE,
        planId: '11111111-2222-3333-4444-555555555555',
        withSentences: false,
        plan: planWith(['Food', 'Kana', 'Counting']),
      }),
    );

    const { results } = await res.json();
    expect(results.map((r: { name: string }) => r.name)).toEqual(['Food', 'Kana', 'Counting']);
    expect(rowsFor('decks').map((d) => d.name)).toEqual(['Kana']);
    // Every week is re-assigned: a deck that survived run 1 may have lost its
    // assignment.
    expect(rowsFor('assignments').map((a) => a.deck_id)).toEqual(['d1', 'd2', 'd3']);
    expect(results[2].assigned).toBe(true);
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

  it('assigns every deck to every current member of the group', async () => {
    seedAccess(['m1', 'm2']);
    insertReturns.decks.push({ data: { id: 'd1' } }, { data: { id: 'd2' } });

    const res = await POST(makeRequest({ ...BASE, plan: planWith(['Food', 'Counting']) }));
    expect(res.status).toBe(200);

    const assignments = rowsFor('assignments');
    expect(assignments).toHaveLength(4);
    expect(assignments.map((a) => `${a.member_id}:${a.deck_id}`).sort()).toEqual([
      'm1:d1',
      'm1:d2',
      'm2:d1',
      'm2:d2',
    ]);
  });

  it('an empty group still gets decks and templates, just no assignments', async () => {
    seedAccess([]);
    insertReturns.decks.push({ data: { id: 'd1' } });

    const res = await POST(makeRequest({ ...BASE, plan: planWith(['Food']) }));
    expect(res.status).toBe(200);

    const { results } = await res.json();
    expect(results[0]).toMatchObject({ status: 'created' });
    expect(rowsFor('assignments')).toHaveLength(0);
    expect(rowsFor('planned_assignments')).toHaveLength(1);
  });

  it('always saves the weekly schedule as templates for late joiners', async () => {
    seedAccess(['m1']);
    insertReturns.decks.push({ data: { id: 'd1' } }, { data: { id: 'd2' } });

    await POST(makeRequest({ ...BASE, plan: planWith(['Food', 'Counting']) }));

    const templates = rowsFor('planned_assignments');
    expect(templates[0]).toMatchObject({
      organizer_id: 'org1',
      group_id: 'g1',
      deck_id: 'd1',
      due_date: '2026-08-09',
    });
    expect(templates[1]).toMatchObject({ deck_id: 'd2', due_date: '2026-08-16' });
    expect(templates[0].title).toContain('Week 1');
  });

  // The deck is shared with everyone the organizer assigns it to, so a set
  // keyed to one learner would leave every other learner on that deck with an
  // empty Kotoba Bubble and no way to fill it.
  it('writes the deck’s shared sentence set, not one learner’s', async () => {
    seedAccess();
    insertReturns.decks.push({ data: { id: 'd1' } });

    await POST(makeRequest({ ...BASE, plan: planWith(['Food']) }));

    expect(generateDeckSentencesMock).toHaveBeenCalledWith(
      expect.objectContaining({ deckId: 'd1', ownerId: 'org1' }),
    );
  });

  it('makes sentences by default — a deck without them cannot open Kotoba Bubble', async () => {
    seedAccess();
    insertReturns.decks.push({ data: { id: 'd1' } });

    await POST(makeRequest({ ...BASE, plan: planWith(['Food']) }));

    expect(generateDeckSentencesMock).toHaveBeenCalledTimes(1);
  });

  it('spends nothing on sentences when the organizer opts out', async () => {
    seedAccess();
    insertReturns.decks.push({ data: { id: 'd1' } });

    const res = await POST(
      makeRequest({ ...BASE, plan: planWith(['Food']), withSentences: false }),
    );

    expect(res.status).toBe(200);
    expect(generateDeckSentencesMock).not.toHaveBeenCalled();
    await expect(res.json()).resolves.toMatchObject({ sentenceResults: [] });
  });
});
