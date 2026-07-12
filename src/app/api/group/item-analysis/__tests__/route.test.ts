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

// Table-keyed chainable Supabase mock.
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

const rpcMock = vi.fn();
const fromMock = vi.fn((table: string) => makeChain(table));

vi.mock('@/app/api/group/_lib/serviceSupabase', () => ({
  getServiceSupabase: () => ({ from: fromMock, rpc: rpcMock }),
}));

import { GET } from '@/app/api/group/item-analysis/route';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ORGANIZER = { id: 'org-1', username: 'teacher', account_type: 'organizer' };

function makeRequest(deckId?: string) {
  const url = deckId
    ? `http://localhost/api/group/item-analysis?deckId=${deckId}`
    : 'http://localhost/api/group/item-analysis';
  return new NextRequest(url, { method: 'GET' });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('GET /api/group/item-analysis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetStore();
    for (const k of Object.keys(tableData)) delete tableData[k];
    requireOrganizerAccountMock.mockResolvedValue(ORGANIZER);
    rpcMock.mockResolvedValue({ data: [], error: null });
  });

  it('returns 403 for a member account (requireOrganizerAccount rejects)', async () => {
    requireOrganizerAccountMock.mockResolvedValue(
      NextResponse.json({ error: 'Organizers only.' }, { status: 403 }),
    );
    const res = await GET(makeRequest('deck-1'));
    expect(res.status).toBe(403);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('returns 400 when deckId is missing', async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(400);
  });

  it('returns 404 when the deck does not belong to this organizer', async () => {
    // decks lookup filters on user_id = org; a foreign deck resolves to null.
    setTable('decks', null, { message: 'no rows' });
    const res = await GET(makeRequest('deck-2'));
    expect(res.status).toBe(404);
    // Never runs the analysis for a deck the organizer doesn't own.
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('returns ranked cards with struggling percentages on success', async () => {
    setTable('decks', { id: 'deck-1', name: 'JLPT N5', emoji: '📗' });
    setTable('profiles', null, null, 4); // 4 members in the group
    rpcMock.mockResolvedValue({
      data: [
        {
          card_id: 'c1',
          word: '水',
          reading: 'みず',
          meaning: 'water',
          attempt_count: 3,
          correct_total: 1,
          wrong_total: 5,
          struggling_count: 3,
        },
      ],
      error: null,
    });

    const res = await GET(makeRequest('deck-1'));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(rpcMock).toHaveBeenCalledWith('group_item_analysis', {
      p_organizer_id: 'org-1',
      p_deck_id: 'deck-1',
    });
    expect(body.deckName).toBe('JLPT N5');
    expect(body.memberCount).toBe(4);
    expect(body.cards[0]).toMatchObject({
      cardId: 'c1',
      word: '水',
      attemptCount: 3,
      strugglingCount: 3,
      strugglingPct: 100,
      classAccuracy: 17, // 1 / 6 rounded
    });
  });

  it('returns 500 when the analysis RPC fails', async () => {
    setTable('decks', { id: 'deck-1', name: 'JLPT N5', emoji: '📗' });
    rpcMock.mockResolvedValue({ data: null, error: { message: 'boom' } });
    const res = await GET(makeRequest('deck-1'));
    expect(res.status).toBe(500);
  });
});
