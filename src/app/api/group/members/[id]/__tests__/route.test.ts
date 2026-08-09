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
const rpcMock = vi.fn<() => Promise<{ data: unknown[] | null; error: { message: string } | null }>>(
  () => Promise.resolve({ data: [], error: null }),
);

vi.mock('@/app/api/group/_lib/serviceSupabase', () => ({
  getServiceSupabase: () => ({ from: fromMock, rpc: rpcMock }),
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

describe('GET /api/group/members/[id] — mastery breakdown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetStore();
    for (const k of Object.keys(tableData)) delete tableData[k];
    requireOrganizerAccountMock.mockResolvedValue(ORGANIZER);
    setTable('profiles', { id: 'm1', username: 'kid', display_name: 'Kid' });
    setTable('group_members', [{ member_id: 'm1', group_id: 'g1', organizer_id: 'org-1' }]);
    setTable('deck_shares', [{ deck_id: 'd1', decks: { id: 'd1', name: 'Deck', emoji: '📚' } }]);
    setTable('cards', [
      { id: 'c1', deck_id: 'd1' },
      { id: 'c2', deck_id: 'd1' },
      { id: 'c3', deck_id: 'd1' },
    ]);
  });

  it('tiers a deck-shared card with no row as new, spaced-out as strong, and shaky as learning', async () => {
    // c3 has no card_progress row at all — never answered in this deck.
    setTable('card_progress', [
      { card_id: 'c1', correct_count: 5, wrong_count: 0, interval_days: 5, ease: 2.5 },
      { card_id: 'c2', correct_count: 1, wrong_count: 1, interval_days: 1, ease: 2.3 },
    ]);

    const res = await GET(makeRequest(), { params });
    const body = await res.json();

    expect(body.totalMastery).toEqual({ new: 1, learning: 1, strong: 1 });
    expect(body.deckProgress).toHaveLength(1);
    expect(body.deckProgress[0].mastery).toEqual({ new: 1, learning: 1, strong: 1 });
  });

  it('counts every card new when the member has no progress rows at all', async () => {
    setTable('card_progress', []);
    const res = await GET(makeRequest(), { params });
    const body = await res.json();
    expect(body.totalMastery).toEqual({ new: 3, learning: 0, strong: 0 });
  });
});

describe('GET /api/group/members/[id] — review backlog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetStore();
    for (const k of Object.keys(tableData)) delete tableData[k];
    requireOrganizerAccountMock.mockResolvedValue(ORGANIZER);
    rpcMock.mockResolvedValue({ data: [], error: null });
    setTable('profiles', { id: 'm1', username: 'kid', display_name: 'Kid' });
    setTable('group_members', [{ member_id: 'm1', group_id: 'g1', organizer_id: 'org-1' }]);
  });

  it('returns the backlog counts for this member', async () => {
    rpcMock.mockResolvedValue({
      data: [{ user_id: 'm1', due_count: 18, overdue_3d_count: 4 }],
      error: null,
    });

    const res = await GET(makeRequest(), { params });
    const body = await res.json();

    expect(rpcMock).toHaveBeenCalledWith('group_review_backlog', { p_user_ids: ['m1'] });
    expect(body).toMatchObject({ reviewsWaiting: 18, reviewsOverdue3d: 4 });
  });

  it('reports zero for a member with nothing due', async () => {
    const res = await GET(makeRequest(), { params });
    const body = await res.json();
    expect(body).toMatchObject({ reviewsWaiting: 0, reviewsOverdue3d: 0 });
  });

  // Null, not 0, so the detail view can drop the card instead of claiming
  // the member is caught up.
  it('reports null when the backlog query fails', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'boom' } });

    const res = await GET(makeRequest(), { params });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({ reviewsWaiting: null, reviewsOverdue3d: null });
  });
});
