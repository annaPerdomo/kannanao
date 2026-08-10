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
  const asPromise = () => Promise.resolve(result());
  const chain: Record<string, unknown> = {};
  ['select', 'eq', 'in', 'order', 'limit'].forEach((m) => {
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

import { GET } from '@/app/api/group/readiness/route';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ORGANIZER = { id: 'org-1', username: 'teacher', account_type: 'organizer' };

function makeRequest(params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();
  return new NextRequest(`http://localhost/api/group/readiness${qs ? `?${qs}` : ''}`, {
    method: 'GET',
  });
}

/** A row shaped like `group_deck_readiness` returns it. */
function row(overrides: Record<string, unknown> = {}) {
  return {
    deck_id: 'deck-1',
    deck_name: 'Kanji Basics',
    deck_emoji: '📘',
    card_count: 10,
    learner_count: 3,
    strong: 4,
    learning: 6,
    unseen: 20,
    accuracy_pct: 72,
    struggling_learner_ids: ['m2'],
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('GET /api/group/readiness', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetStore();
    for (const k of Object.keys(tableData)) delete tableData[k];
    requireOrganizerAccountMock.mockResolvedValue(ORGANIZER);
    setTable('groups', { id: 'group-1', organizer_id: 'org-1' });
    rpcMock.mockResolvedValue({ data: [], error: null });
  });

  it('returns 403 for a member account', async () => {
    requireOrganizerAccountMock.mockResolvedValue(
      NextResponse.json({ error: 'Organizers only.' }, { status: 403 }),
    );
    const res = await GET(makeRequest({ groupId: 'group-1' }));
    expect(res.status).toBe(403);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('returns 400 without a groupId', async () => {
    expect((await GET(makeRequest())).status).toBe(400);
  });

  it('returns 404 for a group the organizer does not own', async () => {
    setTable('groups', null, { message: 'no rows' });
    const res = await GET(makeRequest({ groupId: 'group-2' }));
    expect(res.status).toBe(404);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('returns an empty deck list, not an error, for a group with nothing assigned', async () => {
    const res = await GET(makeRequest({ groupId: 'group-1' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ decks: [] });
  });

  it('maps rollup rows to camelCase and keeps the weakest-first order', async () => {
    rpcMock.mockResolvedValue({
      data: [
        row({ deck_id: 'deck-weak', deck_name: 'Verbs', strong: 1, learning: 9, unseen: 20 }),
        row({ deck_id: 'deck-strong', deck_name: 'Greetings', strong: 25, learning: 3, unseen: 2 }),
      ],
      error: null,
    });

    const res = await GET(makeRequest({ groupId: 'group-1' }));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(rpcMock).toHaveBeenCalledWith('group_deck_readiness', {
      p_organizer: 'org-1',
      p_group: 'group-1',
    });
    expect(body.decks.map((d: { deckId: string }) => d.deckId)).toEqual([
      'deck-weak',
      'deck-strong',
    ]);
    expect(body.decks[0]).toEqual({
      deckId: 'deck-weak',
      deckName: 'Verbs',
      deckEmoji: '📘',
      cardCount: 10,
      learnerCount: 3,
      strong: 1,
      learning: 9,
      unseen: 20,
      accuracyPct: 72,
      strugglingLearnerIds: ['m2'],
    });
  });

  it('keeps an unseen deck accuracy null, never 0', async () => {
    rpcMock.mockResolvedValue({
      data: [row({ accuracy_pct: null, strong: 0, learning: 0, unseen: 30 })],
      error: null,
    });

    const body = await (await GET(makeRequest({ groupId: 'group-1' }))).json();
    expect(body.decks[0].accuracyPct).toBeNull();
    expect(body.decks[0].strugglingLearnerIds).toEqual(['m2']);
  });

  it('returns 500 when the rollup fails', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'boom' } });
    expect((await GET(makeRequest({ groupId: 'group-1' }))).status).toBe(500);
  });
});
