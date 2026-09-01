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
// can assert which rows were completed / progressed.
type Op = { table: string; method: string; args: unknown[] };
const ops: Op[] = [];
const tableData: Record<string, { data: unknown; error: unknown }> = {};
function setTable(table: string, data: unknown, error: unknown = null) {
  tableData[table] = { data, error };
}

function makeChain(table: string) {
  const result = () => tableData[table] ?? { data: null, error: null };
  const chain: Record<string, unknown> = {};
  ['select', 'eq', 'in', 'is', 'or', 'update'].forEach((m) => {
    chain[m] = vi.fn((...args: unknown[]) => {
      ops.push({ table, method: m, args });
      return chain;
    });
  });
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
  kana_set: null,
  required_accuracy: null,
  required_mode: null,
  progress_accuracy: null,
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

/** All update(...) calls, with the values they carried. */
const updates = () => ops.filter((o) => o.method === 'update');
const completionUpdate = () =>
  updates().find((u) => (u.args[0] as Record<string, unknown>).completed_at !== undefined);
const progressUpdates = () =>
  updates().filter((u) => (u.args[0] as Record<string, unknown>).progress_accuracy !== undefined);
/** The ids passed to .in('id', ids) — the batch-complete filter. */
const completedIds = () => {
  const inOp = ops.find((o) => o.method === 'in');
  return inOp ? (inOp.args[1] as string[]) : [];
};

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
  });

  it('returns 401 without an auth header', async () => {
    const res = await POST(makeRequest({ deckId: 'deck-1' }, false));
    expect(res.status).toBe(401);
  });

  it('returns 400 without a deckId', async () => {
    const res = await POST(makeRequest({ sessionId: 's1' }));
    expect(res.status).toBe(400);
  });

  it('returns completed: 0 when there is no pending assignment', async () => {
    setTable('assignments', []);
    const res = await POST(makeRequest({ deckId: 'deck-1', sessionId: 's1' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ completed: 0 });
  });

  // ── null criteria (legacy behavior) ───────────────────────────────────────

  it('completes a null-criteria assignment without any session data', async () => {
    setTable('assignments', [assignment()]);
    const res = await POST(makeRequest({ deckId: 'deck-1' }));
    const json = await res.json();
    expect(json.completed).toBe(1);
    expect(completedIds()).toEqual(['a1']);
    // No session lookup should have happened
    expect(ops.filter((o) => o.table === 'study_sessions')).toHaveLength(0);
  });

  // ── mastery criteria ──────────────────────────────────────────────────────

  it('completes when the session meets the accuracy goal', async () => {
    setTable('assignments', [assignment({ required_accuracy: 80 })]);
    setTable('study_sessions', session({ cards_studied: 10, cards_correct: 9 }));
    const res = await POST(makeRequest({ deckId: 'deck-1', sessionId: 's1' }));
    const json = await res.json();
    expect(json.completed).toBe(1);
    expect(completedIds()).toEqual(['a1']);
    // The final score is stamped as progress too
    expect(progressUpdates()).toHaveLength(1);
    expect(progressUpdates()[0].args[0]).toEqual({ progress_accuracy: 90 });
  });

  it('does not complete but records best-so-far when accuracy falls short', async () => {
    setTable('assignments', [assignment({ required_accuracy: 80 })]);
    setTable('study_sessions', session({ cards_studied: 10, cards_correct: 6 }));
    const res = await POST(makeRequest({ deckId: 'deck-1', sessionId: 's1' }));
    const json = await res.json();
    expect(json.completed).toBe(0);
    expect(json.progressUpdated).toBe(1);
    expect(completionUpdate()).toBeUndefined();
    expect(progressUpdates()[0].args[0]).toEqual({ progress_accuracy: 60 });
  });

  it('does not downgrade an existing better progress_accuracy', async () => {
    setTable('assignments', [assignment({ required_accuracy: 90, progress_accuracy: 85 })]);
    setTable('study_sessions', session({ cards_studied: 10, cards_correct: 7 }));
    const res = await POST(makeRequest({ deckId: 'deck-1', sessionId: 's1' }));
    const json = await res.json();
    expect(json.completed).toBe(0);
    expect(json.progressUpdated).toBe(0);
    expect(progressUpdates()).toHaveLength(0);
  });

  it('does not complete on a mode mismatch and records no progress', async () => {
    setTable('assignments', [assignment({ required_mode: 'recall', required_accuracy: 50 })]);
    setTable('study_sessions', session({ practice_mode: 'match', cards_correct: 10 }));
    const res = await POST(makeRequest({ deckId: 'deck-1', sessionId: 's1' }));
    const json = await res.json();
    expect(json.completed).toBe(0);
    expect(json.progressUpdated).toBe(0);
  });

  it('rejects a tiny perfect session (5-card floor)', async () => {
    setTable('assignments', [assignment({ required_accuracy: 80 })]);
    setTable('study_sessions', session({ cards_studied: 1, cards_correct: 1 }));
    const res = await POST(makeRequest({ deckId: 'deck-1', sessionId: 's1' }));
    const json = await res.json();
    expect(json.completed).toBe(0);
    expect(json.progressUpdated).toBe(0);
  });

  it('completes a small deck on its whole deck (floor capped at deck size)', async () => {
    setTable('assignments', [assignment({ required_accuracy: 80 })]);
    setTable('study_sessions', session({ cards_studied: 3, cards_correct: 3 }));
    setTable('decks', { card_count: 3 });
    const res = await POST(makeRequest({ deckId: 'deck-1', sessionId: 's1' }));
    const json = await res.json();
    expect(json.completed).toBe(1);
    expect(completedIds()).toEqual(['a1']);
  });

  it('keeps rejecting a short session on a deck bigger than the floor', async () => {
    setTable('assignments', [assignment({ required_accuracy: 80 })]);
    setTable('study_sessions', session({ cards_studied: 3, cards_correct: 3 }));
    setTable('decks', { card_count: 20 });
    const res = await POST(makeRequest({ deckId: 'deck-1', sessionId: 's1' }));
    expect((await res.json()).completed).toBe(0);
  });

  it('ignores criteria assignments when no sessionId is sent', async () => {
    setTable('assignments', [assignment({ required_accuracy: 80 })]);
    const res = await POST(makeRequest({ deckId: 'deck-1' }));
    const json = await res.json();
    expect(json.completed).toBe(0);
    expect(ops.filter((o) => o.table === 'study_sessions')).toHaveLength(0);
  });

  it('ignores a session that belongs to another user or another deck', async () => {
    setTable('assignments', [assignment({ required_accuracy: 50 })]);
    setTable('study_sessions', session({ user_id: 'someone-else' }));
    const res = await POST(makeRequest({ deckId: 'deck-1', sessionId: 's1' }));
    expect((await res.json()).completed).toBe(0);

    ops.length = 0;
    setTable('study_sessions', session({ deck_id: 'other-deck' }));
    const res2 = await POST(makeRequest({ deckId: 'deck-1', sessionId: 's1' }));
    expect((await res2.json()).completed).toBe(0);
  });

  it('completes null-criteria assignments while a criteria one stays pending', async () => {
    setTable('assignments', [
      assignment({ id: 'a1' }),
      assignment({ id: 'a2', required_accuracy: 95 }),
    ]);
    setTable('study_sessions', session({ cards_studied: 10, cards_correct: 8 }));
    const res = await POST(makeRequest({ deckId: 'deck-1', sessionId: 's1' }));
    const json = await res.json();
    expect(json.completed).toBe(1);
    expect(completedIds()).toEqual(['a1']);
    expect(json.progressUpdated).toBe(1); // a2 records 80%
  });

  it('returns 400 when both a deck and a kana row are named', async () => {
    const res = await POST(makeRequest({ deckId: 'deck-1', kanaSet: 'hira-ka', sessionId: 's1' }));
    expect(res.status).toBe(400);
  });

  it('matches pending kana assignments on kana_set, not deck_id', async () => {
    setTable('assignments', []);
    await POST(makeRequest({ kanaSet: 'hira-ka', sessionId: 's1' }));
    const eqs = ops.filter((o) => o.table === 'assignments' && o.method === 'eq');
    expect(eqs.map((o) => o.args[0])).toContain('kana_set');
    expect(eqs.map((o) => o.args[0])).not.toContain('deck_id');
  });

  it('completes a kana assignment from a session scoped to that row', async () => {
    setTable('assignments', [assignment({ kana_set: 'hira-ka' })]);
    setTable('study_sessions', session({ deck_id: null, kana_set: 'hira-ka' }));
    const res = await POST(makeRequest({ kanaSet: 'hira-ka', sessionId: 's1' }));
    expect((await res.json()).completed).toBe(1);
    expect(completedIds()).toEqual(['a1']);
  });

  it('does not complete a kana assignment from a mixed session', async () => {
    setTable('assignments', [assignment({ kana_set: 'hira-ka' })]);
    setTable('study_sessions', session({ deck_id: null, kana_set: null }));
    const res = await POST(makeRequest({ kanaSet: 'hira-ka', sessionId: 's1' }));
    expect((await res.json()).completed).toBe(0);
  });

  it('never completes a kana assignment without a session to check', async () => {
    setTable('assignments', [assignment({ kana_set: 'hira-ka' })]);
    const res = await POST(makeRequest({ kanaSet: 'hira-ka' }));
    expect((await res.json()).completed).toBe(0);
  });

  it('grades a kana accuracy goal against the session', async () => {
    setTable('assignments', [assignment({ kana_set: 'hira-ka', required_accuracy: 95 })]);
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
