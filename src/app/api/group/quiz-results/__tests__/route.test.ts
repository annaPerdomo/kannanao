import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { _resetStore } from '@/app/api/_lib/rateLimit';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const { requireOrganizerAccountMock } = vi.hoisted(() => ({
  requireOrganizerAccountMock: vi.fn(),
}));

vi.mock('@/app/api/_lib/requireOrganizerAccount', () => ({
  requireOrganizerAccount: (...args: unknown[]) => requireOrganizerAccountMock(...args),
}));

const tableData: Record<string, { data: unknown; error: unknown }> = {};
function setTable(table: string, data: unknown, error: unknown = null) {
  tableData[table] = { data, error };
}

function makeChain(table: string) {
  const result = () => tableData[table] ?? { data: null, error: null };
  const chain: Record<string, unknown> = {};
  ['select', 'eq', 'in', 'order', 'limit'].forEach((m) => {
    chain[m] = vi.fn(() => chain);
  });
  chain.then = (onfulfilled: (v: unknown) => unknown, onrejected?: (e: unknown) => unknown) =>
    Promise.resolve(result()).then(onfulfilled, onrejected);
  return chain;
}

const fromMock = vi.fn((table: string) => makeChain(table));

vi.mock('@/app/api/group/_lib/serviceSupabase', () => ({
  getServiceSupabase: () => ({ from: fromMock }),
}));

import { GET } from '@/app/api/group/quiz-results/route';

const ORGANIZER = { id: 'org-1', username: 'teacher', account_type: 'organizer' };

function makeRequest(query = '?deckId=deck-1') {
  return new NextRequest(`http://localhost/api/group/quiz-results${query}`, {
    method: 'GET',
    headers: { authorization: 'Bearer tok' },
  });
}

describe('GET /api/group/quiz-results', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetStore();
    for (const k of Object.keys(tableData)) delete tableData[k];
    requireOrganizerAccountMock.mockResolvedValue(ORGANIZER);
  });

  it('returns 403 when the requester is not an organizer', async () => {
    requireOrganizerAccountMock.mockResolvedValue(
      NextResponse.json({ error: 'Organizers only.' }, { status: 403 }),
    );
    const res = await GET(makeRequest());
    expect(res.status).toBe(403);
  });

  it('returns 400 when deckId is missing', async () => {
    const res = await GET(makeRequest(''));
    expect(res.status).toBe(400);
  });

  it('aggregates best (by accuracy, then score), latest, and attempt count per member', async () => {
    setTable('profiles', [
      { id: 'm1', username: 'aiko', display_name: 'Aiko' },
      { id: 'm2', username: 'ben', display_name: null },
    ]);
    // Ordered newest-first as the route requests. m1 has two attempts.
    setTable('quiz_results', [
      { user_id: 'm1', score: 7, total: 10, accuracy: 70, taken_at: '2026-07-12T12:00:00Z' },
      { user_id: 'm1', score: 9, total: 10, accuracy: 90, taken_at: '2026-07-11T12:00:00Z' },
    ]);

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const json = await res.json();

    const aiko = json.find((r: { memberId: string }) => r.memberId === 'm1');
    expect(aiko.name).toBe('Aiko');
    expect(aiko.attempts).toBe(2);
    expect(aiko.best).toEqual({ score: 9, total: 10, accuracy: 90 }); // best accuracy, not latest
    expect(aiko.latest.accuracy).toBe(70); // newest row
    expect(aiko.latest.takenAt).toBe('2026-07-12T12:00:00Z');

    const ben = json.find((r: { memberId: string }) => r.memberId === 'm2');
    expect(ben.name).toBe('ben'); // falls back to username
    expect(ben.attempts).toBe(0);
    expect(ben.best).toBeNull();
    expect(ben.latest).toBeNull();
  });

  it('returns an empty array when the organizer has no members', async () => {
    setTable('profiles', []);
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it('returns 500 when the members query fails', async () => {
    setTable('profiles', null, { message: 'boom' });
    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
  });
});
