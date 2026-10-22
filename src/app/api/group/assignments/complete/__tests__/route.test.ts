import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { _resetStore } from '@/app/api/_lib/rateLimit';
import { DataError } from '@/lib/dataError';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const { getUserFromTokenMock, getUserFromTokenResultMock } = vi.hoisted(() => ({
  getUserFromTokenMock: vi.fn(),
  getUserFromTokenResultMock: vi.fn(),
}));

vi.mock('@/app/api/_lib/authCache', () => ({
  getUserFromToken: (...args: unknown[]) => getUserFromTokenMock(...args),
  getUserFromTokenResult: (...args: unknown[]) => getUserFromTokenResultMock(...args),
  _resetAuthCache: vi.fn(),
}));

// Table-keyed chainable Supabase mock that also records every call so tests
// can assert which rows were completed / progressed, and which filters a
// query carried.
type Op = { table: string; method: string; args: unknown[] };
const ops: Op[] = [];
const tableData: Record<string, { data: unknown; error: unknown }> = {};
function setTable(table: string, data: unknown, error: unknown = null) {
  tableData[table] = { data, error };
}

function makeChain(table: string) {
  const result = () => tableData[table] ?? { data: null, error: null };
  const chain: Record<string, unknown> = {};
  ['select', 'eq', 'in', 'is', 'or', 'not', 'order', 'update'].forEach((m) => {
    chain[m] = vi.fn((...args: unknown[]) => {
      ops.push({ table, method: m, args });
      return chain;
    });
  });
  chain.range = vi.fn(() => Promise.resolve(result()));
  chain.maybeSingle = vi.fn(() => Promise.resolve(result()));
  chain.then = (onfulfilled: (v: unknown) => unknown, onrejected?: (e: unknown) => unknown) =>
    Promise.resolve(result()).then(onfulfilled, onrejected);
  return chain;
}

const fromMock = vi.fn((table: string) => makeChain(table));

vi.mock('@/app/api/group/_lib/serviceSupabase', () => ({
  getServiceSupabase: () => ({ from: fromMock }),
}));

import { POST } from '@/app/api/group/assignments/complete/route';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const USER = { id: 'user-1' };
const CREATED_AT = '2026-01-01T00:00:00Z';

function makeRequest(body: unknown, withAuth = true) {
  return new NextRequest('http://localhost/api/group/assignments/complete', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(withAuth ? { authorization: 'Bearer tok' } : {}),
    },
    body: JSON.stringify(body),
  });
}

const assignment = (overrides: Record<string, unknown> = {}) => ({
  id: 'a1',
  deck_id: 'deck-1',
  kana_set: null,
  required_accuracy: null,
  required_mode: null,
  progress_accuracy: null,
  baseline_accuracy: 80,
  goal_met_at: null,
  created_at: CREATED_AT,
  ...overrides,
});

const session = (overrides: Record<string, unknown> = {}) => ({
  user_id: USER.id,
  deck_id: 'deck-1',
  kana_set: null,
  practice_mode: 'match',
  cards_studied: 10,
  cards_correct: 9,
  ...overrides,
});

const cardRows = (n: number, deckId = 'deck-1') =>
  Array.from({ length: n }, (_, i) => ({ id: `c${i + 1}`, deck_id: deckId }));

/** card_progress rows for the first `seen` cards, `known` of them with interval_days >= 1. */
function progressRows(args: { seen: number; known: number; before?: boolean }) {
  const { seen, known, before = false } = args;
  const lastReviewedAt = before ? '2025-12-01T00:00:00Z' : '2026-02-01T00:00:00Z';
  return Array.from({ length: seen }, (_, i) => ({
    card_id: `c${i + 1}`,
    last_reviewed_at: lastReviewedAt,
    interval_days: i < known ? 1 : 0,
  }));
}

/** All update(...) calls, with the values they carried. */
const updates = () => ops.filter((o) => o.method === 'update');
const completionUpdate = () =>
  updates().find((u) => (u.args[0] as Record<string, unknown>).completed_at !== undefined);
const goalMetUpdate = () =>
  updates().find((u) => (u.args[0] as Record<string, unknown>).goal_met_at !== undefined);
const progressUpdates = () =>
  updates().filter((u) => (u.args[0] as Record<string, unknown>).progress_accuracy !== undefined);

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('POST /api/group/assignments/complete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetStore();
    ops.length = 0;
    for (const k of Object.keys(tableData)) delete tableData[k];
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    getUserFromTokenMock.mockResolvedValue(USER);
    getUserFromTokenResultMock.mockImplementation(async (...args: unknown[]) => ({
      value: await getUserFromTokenMock(...args),
      error: null,
    }));
    setTable('cards', []);
    setTable('card_progress', []);
  });

  it('returns 401 without an auth header', async () => {
    const res = await POST(makeRequest({ deckId: 'deck-1' }, false));
    expect(res.status).toBe(401);
  });

  it('returns 400 without any of deckId/kanaSet/allDecks', async () => {
    const res = await POST(makeRequest({ sessionId: 's1' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when both a deck and a kana row are named', async () => {
    const res = await POST(makeRequest({ deckId: 'deck-1', kanaSet: 'hira-ka', sessionId: 's1' }));
    expect(res.status).toBe(400);
  });

  it('returns completed: 0 when there is no pending assignment', async () => {
    setTable('assignments', []);
    const res = await POST(makeRequest({ deckId: 'deck-1', sessionId: 's1' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ completed: 0 });
  });

  it('does not complete a no-goal assignment on a 0-answer session', async () => {
    setTable('assignments', [assignment()]);
    setTable('cards', cardRows(2));
    setTable('card_progress', []);
    const res = await POST(makeRequest({ deckId: 'deck-1' }));
    expect((await res.json()).completed).toBe(0);
  });

  it('completes a no-goal assignment once every card is seen at the baseline', async () => {
    setTable('assignments', [assignment({ baseline_accuracy: 80 })]);
    setTable('cards', cardRows(5));
    setTable('card_progress', progressRows({ seen: 5, known: 4 }));
    const res = await POST(makeRequest({ deckId: 'deck-1' }));
    const json = await res.json();
    expect(json.completed).toBe(1);
    expect(json.words.a1).toEqual({ total: 5, seen: 5, known: 4 });
  });

  it('does not count a card last reviewed before the assignment was created', async () => {
    setTable('assignments', [assignment({ created_at: '2026-01-10T00:00:00Z' })]);
    setTable('cards', cardRows(3));
    setTable('card_progress', progressRows({ seen: 3, known: 3, before: true }));
    const res = await POST(makeRequest({ deckId: 'deck-1' }));
    const json = await res.json();
    expect(json.completed).toBe(0);
    expect(json.words.a1).toEqual({ total: 3, seen: 0, known: 0 });
  });

  it('does not complete when all cards are seen but known falls under the baseline', async () => {
    setTable('assignments', [assignment({ baseline_accuracy: 90 })]);
    setTable('cards', cardRows(5));
    setTable('card_progress', progressRows({ seen: 5, known: 4 }));
    const res = await POST(makeRequest({ deckId: 'deck-1' }));
    expect((await res.json()).completed).toBe(0);
  });

  it('records a met mode goal without completing when words are not yet done', async () => {
    setTable('assignments', [assignment({ required_accuracy: 80 })]);
    setTable('cards', cardRows(5));
    setTable('card_progress', progressRows({ seen: 2, known: 2 }));
    setTable('study_sessions', session({ cards_studied: 10, cards_correct: 9 }));
    const res = await POST(makeRequest({ deckId: 'deck-1', sessionId: 's1' }));
    const json = await res.json();
    expect(json.completed).toBe(0);
    expect(goalMetUpdate()).toBeDefined();
    expect(completionUpdate()).toBeUndefined();
  });

  it('completes once words catch up after the mode goal was already met', async () => {
    setTable('assignments', [
      assignment({ required_accuracy: 80, goal_met_at: '2026-01-05T00:00:00Z' }),
    ]);
    setTable('cards', cardRows(5));
    setTable('card_progress', progressRows({ seen: 5, known: 4 }));
    const res = await POST(makeRequest({ deckId: 'deck-1' }));
    const json = await res.json();
    expect(json.completed).toBe(1);
  });

  it('does not re-grade the mode goal once goal_met_at is already set', async () => {
    setTable('assignments', [
      assignment({ required_accuracy: 95, goal_met_at: '2026-01-05T00:00:00Z' }),
    ]);
    setTable('cards', cardRows(5));
    setTable('card_progress', progressRows({ seen: 5, known: 4 }));
    setTable('study_sessions', session({ cards_studied: 10, cards_correct: 1 }));
    const res = await POST(makeRequest({ deckId: 'deck-1', sessionId: 's1' }));
    expect((await res.json()).completed).toBe(1);
  });

  it('still records best-so-far progress_accuracy after the goal is already met', async () => {
    setTable('assignments', [
      assignment({ required_accuracy: 50, goal_met_at: '2026-01-05T00:00:00Z' }),
    ]);
    setTable('cards', cardRows(5));
    setTable('card_progress', progressRows({ seen: 2, known: 2 }));
    setTable('study_sessions', session({ cards_studied: 10, cards_correct: 9 }));
    const res = await POST(makeRequest({ deckId: 'deck-1', sessionId: 's1' }));
    const json = await res.json();
    expect(json.completed).toBe(0);
    expect(json.progressUpdated).toBe(1);
    expect(progressUpdates()[0].args[0]).toEqual({ progress_accuracy: 90 });
    expect(goalMetUpdate()).toBeUndefined();
  });

  it('completes a no-goal assignment on an empty deck (nothing to answer)', async () => {
    setTable('assignments', [assignment()]);
    setTable('cards', cardRows(0));
    const res = await POST(makeRequest({ deckId: 'deck-1' }));
    expect((await res.json()).completed).toBe(1);
  });

  it('completes an empty deck via allDecks too', async () => {
    setTable('assignments', [assignment()]);
    setTable('cards', cardRows(0));
    const res = await POST(makeRequest({ allDecks: true }));
    expect((await res.json()).completed).toBe(1);
  });

  it('returns 500 when word progress cannot be computed (deckId)', async () => {
    setTable('assignments', [assignment()]);
    setTable('cards', null, { message: 'boom' });
    const res = await POST(makeRequest({ deckId: 'deck-1' }));
    expect(res.status).toBe(500);
  });

  it('returns 500 when word progress cannot be computed (allDecks)', async () => {
    setTable('assignments', [assignment()]);
    setTable('cards', null, { message: 'boom' });
    const res = await POST(makeRequest({ allDecks: true }));
    expect(res.status).toBe(500);
  });

  it('does not complete on a mode mismatch and records no progress', async () => {
    setTable('assignments', [assignment({ required_mode: 'recall', required_accuracy: 50 })]);
    setTable('cards', cardRows(5));
    setTable('card_progress', progressRows({ seen: 5, known: 5 }));
    setTable('study_sessions', session({ practice_mode: 'match', cards_correct: 10 }));
    const res = await POST(makeRequest({ deckId: 'deck-1', sessionId: 's1' }));
    const json = await res.json();
    expect(json.completed).toBe(0);
    expect(json.progressUpdated).toBe(0);
  });

  it('does not downgrade an existing better progress_accuracy', async () => {
    setTable('assignments', [assignment({ required_accuracy: 90, progress_accuracy: 85 })]);
    setTable('cards', cardRows(5));
    setTable('card_progress', progressRows({ seen: 5, known: 5 }));
    setTable('study_sessions', session({ cards_studied: 10, cards_correct: 7 }));
    const res = await POST(makeRequest({ deckId: 'deck-1', sessionId: 's1' }));
    const json = await res.json();
    expect(json.completed).toBe(0);
    expect(json.progressUpdated).toBe(0);
    expect(progressUpdates()).toHaveLength(0);
  });

  it('rejects a tiny perfect session (5-card floor) even when words are done', async () => {
    setTable('assignments', [assignment({ required_accuracy: 80 })]);
    setTable('cards', cardRows(5));
    setTable('card_progress', progressRows({ seen: 5, known: 5 }));
    setTable('study_sessions', session({ cards_studied: 1, cards_correct: 1 }));
    const res = await POST(makeRequest({ deckId: 'deck-1', sessionId: 's1' }));
    const json = await res.json();
    expect(json.completed).toBe(0);
    expect(json.progressUpdated).toBe(0);
  });

  it('ignores a session that belongs to another user or another deck', async () => {
    setTable('assignments', [assignment({ required_accuracy: 50 })]);
    setTable('cards', cardRows(5));
    setTable('card_progress', progressRows({ seen: 5, known: 5 }));
    setTable('study_sessions', session({ user_id: 'someone-else' }));
    const res = await POST(makeRequest({ deckId: 'deck-1', sessionId: 's1' }));
    expect((await res.json()).completed).toBe(0);

    setTable('study_sessions', session({ deck_id: 'other-deck' }));
    const res2 = await POST(makeRequest({ deckId: 'deck-1', sessionId: 's1' }));
    expect((await res2.json()).completed).toBe(0);
  });

  it('completes a no-goal assignment via allDecks once words are done', async () => {
    setTable('assignments', [assignment()]);
    setTable('cards', cardRows(5));
    setTable('card_progress', progressRows({ seen: 5, known: 4 }));
    const res = await POST(makeRequest({ allDecks: true }));
    const json = await res.json();
    expect(json.completed).toBe(1);
  });

  it('completes via allDecks once words catch up after an earlier-met mode goal', async () => {
    setTable('assignments', [
      assignment({ required_accuracy: 80, goal_met_at: '2026-01-05T00:00:00Z' }),
    ]);
    setTable('cards', cardRows(5));
    setTable('card_progress', progressRows({ seen: 5, known: 4 }));
    const res = await POST(makeRequest({ allDecks: true, sessionId: 's1' }));
    expect((await res.json()).completed).toBe(1);
  });

  it('filters allDecks to assignments with no mode goal or an already-met one', async () => {
    setTable('assignments', []);
    await POST(makeRequest({ allDecks: true }));
    const orArgs = ops
      .filter((o) => o.table === 'assignments' && o.method === 'or')
      .map((o) => o.args[0]);
    expect(orArgs.some((a) => typeof a === 'string' && a.includes('goal_met_at.not.is.null'))).toBe(
      true,
    );
    const notArgs = ops.filter((o) => o.table === 'assignments' && o.method === 'not');
    expect(notArgs.some((o) => o.args[0] === 'deck_id')).toBe(true);
  });

  it('returns an empty words map when allDecks finds nothing pending', async () => {
    setTable('assignments', []);
    const res = await POST(makeRequest({ allDecks: true }));
    expect(await res.json()).toEqual({ completed: 0, progressUpdated: 0, words: {} });
  });

  it('matches pending kana assignments on kana_set, not deck_id', async () => {
    setTable('assignments', []);
    await POST(makeRequest({ kanaSet: 'hira-ka', sessionId: 's1' }));
    const eqs = ops.filter((o) => o.table === 'assignments' && o.method === 'eq');
    expect(eqs.map((o) => o.args[0])).toContain('kana_set');
    expect(eqs.map((o) => o.args[0])).not.toContain('deck_id');
  });

  it('completes a kana assignment from a session scoped to that row', async () => {
    setTable('assignments', [assignment({ deck_id: null, kana_set: 'hira-ka' })]);
    setTable('study_sessions', session({ deck_id: null, kana_set: 'hira-ka' }));
    const res = await POST(makeRequest({ kanaSet: 'hira-ka', sessionId: 's1' }));
    expect((await res.json()).completed).toBe(1);
  });

  it('does not complete a kana assignment from a mixed session', async () => {
    setTable('assignments', [assignment({ deck_id: null, kana_set: 'hira-ka' })]);
    setTable('study_sessions', session({ deck_id: null, kana_set: null }));
    const res = await POST(makeRequest({ kanaSet: 'hira-ka', sessionId: 's1' }));
    expect((await res.json()).completed).toBe(0);
  });

  it('never completes a kana assignment without a session to check', async () => {
    setTable('assignments', [assignment({ deck_id: null, kana_set: 'hira-ka' })]);
    const res = await POST(makeRequest({ kanaSet: 'hira-ka' }));
    expect((await res.json()).completed).toBe(0);
  });

  it('grades a kana accuracy goal against the session', async () => {
    setTable('assignments', [
      assignment({ deck_id: null, kana_set: 'hira-ka', required_accuracy: 95 }),
    ]);
    setTable(
      'study_sessions',
      session({ deck_id: null, kana_set: 'hira-ka', cards_studied: 10, cards_correct: 9 }),
    );
    const res = await POST(makeRequest({ kanaSet: 'hira-ka', sessionId: 's1' }));
    const json = await res.json();
    expect(json.completed).toBe(0);
    expect(json.progressUpdated).toBe(1);
    expect(progressUpdates()[0].args[0]).toEqual({ progress_accuracy: 90 });
  });

  it('returns 500 when the assignment lookup fails', async () => {
    setTable('assignments', null, { message: 'boom' });
    const res = await POST(makeRequest({ deckId: 'deck-1' }));
    expect(res.status).toBe(500);
  });

  it('returns 503 when the auth service itself is unreachable', async () => {
    getUserFromTokenResultMock.mockResolvedValue({
      value: null,
      error: new DataError('upstream', 'gateway down'),
    });
    const res = await POST(makeRequest({ deckId: 'deck-1' }));
    expect(res.status).toBe(503);
  });
});
