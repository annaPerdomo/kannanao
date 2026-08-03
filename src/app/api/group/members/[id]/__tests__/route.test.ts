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

const tableData: Record<string, { data: unknown; error: unknown; count?: number }> = {};
function setTable(table: string, data: unknown, error: unknown = null, count?: number) {
  tableData[table] = { data, error, count };
}

function makeChain(table: string) {
  const result = () => tableData[table] ?? { data: null, error: null };
  const asPromise = () => Promise.resolve(result());
  const chain: Record<string, unknown> = {};
  ['select', 'eq', 'in', 'order', 'limit', 'gt'].forEach((m) => {
    chain[m] = vi.fn(() => chain);
  });
  chain.single = vi.fn(() => asPromise());
  chain.maybeSingle = vi.fn(() => asPromise());
  chain.then = (onfulfilled: (v: unknown) => unknown, onrejected?: (e: unknown) => unknown) =>
    asPromise().then(onfulfilled, onrejected);
  return chain;
}

const fromMock = vi.fn((table: string) => makeChain(table));

vi.mock('@/app/api/group/_lib/serviceSupabase', () => ({
  getServiceSupabase: () => ({ from: fromMock }),
}));

import { GET } from '@/app/api/group/members/[id]/route';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ORGANIZER = { id: 'org-1', username: 'teacher', account_type: 'organizer' };

function makeRequest() {
  return new NextRequest('http://localhost/api/group/members/m1', { method: 'GET' });
}
const params = Promise.resolve({ id: 'm1' });

/** A card_progress row shaped as the PostgREST embed the route selects. */
function weakRow(overrides: Record<string, unknown> = {}) {
  return {
    card_id: 'c1',
    correct_count: 1,
    wrong_count: 4,
    last_reviewed_at: '2026-07-01T00:00:00Z',
    cards: { word: '水', reading: 'みず', meaning: 'water', decks: { name: 'N5' } },
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('GET /api/group/members/[id] — weak words', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetStore();
    for (const k of Object.keys(tableData)) delete tableData[k];
    requireOrganizerAccountMock.mockResolvedValue(ORGANIZER);
    setTable('profiles', { id: 'm1', username: 'kid', display_name: 'Kid' });
    setTable('group_members', [{ member_id: 'm1', group_id: 'g1', organizer_id: 'org-1' }]);
  });

  it('returns 403 for a member account', async () => {
    requireOrganizerAccountMock.mockResolvedValue(
      NextResponse.json({ error: 'Organizers only.' }, { status: 403 }),
    );
    const res = await GET(makeRequest(), { params });
    expect(res.status).toBe(403);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the member doesn't belong to this organizer", async () => {
    // A learner outside this organizer's groups has no membership row.
    setTable('group_members', []);
    setTable('profiles', null, { message: 'no rows' });
    const res = await GET(makeRequest(), { params });
    expect(res.status).toBe(404);
  });

  it('ranks weak words by wrong-rate then wrong count and caps the shape', async () => {
    setTable('card_progress', [
      // 4/10 wrong = 0.4 rate, but more raw wrongs
      weakRow({ card_id: 'c-low-rate', correct_count: 6, wrong_count: 4 }),
      // 3/4 wrong = 0.75 rate — should rank first despite fewer raw wrongs
      weakRow({ card_id: 'c-high-rate', correct_count: 1, wrong_count: 3 }),
    ]);

    const res = await GET(makeRequest(), { params });
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.weakWords).toHaveLength(2);
    expect(body.weakWords[0].cardId).toBe('c-high-rate');
    expect(body.weakWords[0]).toMatchObject({
      word: '水',
      reading: 'みず',
      meaning: 'water',
      deckName: 'N5',
      wrongCount: 3,
    });
  });

  it('returns an empty weakWords list when the member has no misses', async () => {
    setTable('card_progress', []);
    const res = await GET(makeRequest(), { params });
    const body = await res.json();
    expect(body.weakWords).toEqual([]);
  });
});
