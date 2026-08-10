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

import { GET } from '@/app/api/group/difficult-words/route';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ORGANIZER = { id: 'org-1', username: 'teacher', account_type: 'organizer' };

function makeRequest(params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();
  return new NextRequest(`http://localhost/api/group/difficult-words${qs ? `?${qs}` : ''}`, {
    method: 'GET',
  });
}

/** A row shaped like `group_difficult_words` returns it. */
function row(overrides: Record<string, unknown> = {}) {
  return {
    card_id: 'c1',
    deck_id: 'deck-1',
    word: '覚える',
    reading: 'おぼえる',
    meaning: 'to memorize',
    attempt_count: 12,
    learner_count: 4,
    struggling_count: 1,
    low_ease_count: 0,
    lapse_learner_count: 0,
    avg_ease: 2.4,
    class_accuracy: 58,
    ...overrides,
  };
}

function seedGroupWithOneDeck() {
  setTable('groups', { id: 'group-1' });
  setTable('group_members', [{ member_id: 'm1' }, { member_id: 'm2' }]);
  setTable('assignments', [{ deck_id: 'deck-1' }, { deck_id: 'deck-1' }]);
  setTable('decks', [{ id: 'deck-1', name: 'Kanji Basics', emoji: '📘' }]);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('GET /api/group/difficult-words', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetStore();
    for (const k of Object.keys(tableData)) delete tableData[k];
    requireOrganizerAccountMock.mockResolvedValue(ORGANIZER);
    rpcMock.mockResolvedValue({ data: [], error: null });
  });

  it('returns 403 for a member account', async () => {
    requireOrganizerAccountMock.mockResolvedValue(
      NextResponse.json({ error: 'Organizers only.' }, { status: 403 }),
    );
    const res = await GET(makeRequest({ groupId: 'group-1' }));
    expect(res.status).toBe(403);
    expect(fromMock).not.toHaveBeenCalled();
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

  it('returns an empty list, not an error, when no deck is assigned to the group', async () => {
    setTable('groups', { id: 'group-1' });
    setTable('group_members', [{ member_id: 'm1' }]);
    setTable('assignments', []);

    const res = await GET(makeRequest({ groupId: 'group-1' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ learnerCount: 1, decks: [], words: [] });
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('scans every assigned deck once and labels each word with its reason', async () => {
    seedGroupWithOneDeck();
    rpcMock.mockResolvedValue({
      data: [
        row({ card_id: 'forgot', lapse_learner_count: 3, avg_ease: 2.0 }),
        row({ card_id: 'chronic', avg_ease: 1.4, attempt_count: 9, low_ease_count: 2 }),
        row({ card_id: 'shaky', avg_ease: 2.5, struggling_count: 1 }),
      ],
      error: null,
    });

    const res = await GET(makeRequest({ groupId: 'group-1' }));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(rpcMock).toHaveBeenCalledWith('group_difficult_words', {
      p_user_ids: ['m1', 'm2'],
      p_deck_ids: ['deck-1'],
    });
    expect(body.learnerCount).toBe(2);
    expect(body.decks).toEqual([{ id: 'deck-1', name: 'Kanji Basics', emoji: '📘' }]);
    expect(body.words.map((w: { reason: string }) => w.reason)).toEqual([
      'forgotten',
      'missed',
      'shaky',
    ]);
    // Affected count follows the reason, and the deck name is joined in.
    expect(body.words[0]).toMatchObject({
      cardId: 'forgot',
      deckName: 'Kanji Basics',
      learnersAffected: 3,
      learnerCount: 4,
      classAccuracy: 58,
    });
    expect(body.words[1].learnersAffected).toBe(2);
    expect(body.words[2].learnersAffected).toBe(1);
  });

  it('drops a row that satisfies no reason rather than showing an unexplained word', async () => {
    seedGroupWithOneDeck();
    rpcMock.mockResolvedValue({ data: [row({ struggling_count: 0 })], error: null });

    const body = await (await GET(makeRequest({ groupId: 'group-1' }))).json();
    expect(body.words).toEqual([]);
  });

  it('narrows the scan to one deck when asked', async () => {
    seedGroupWithOneDeck();
    await GET(makeRequest({ groupId: 'group-1', deckId: 'deck-1' }));
    expect(rpcMock).toHaveBeenCalledWith('group_difficult_words', {
      p_user_ids: ['m1', 'm2'],
      p_deck_ids: ['deck-1'],
    });
  });

  it('404s a deckId that is not assigned to this group', async () => {
    seedGroupWithOneDeck();
    const res = await GET(makeRequest({ groupId: 'group-1', deckId: 'someone-elses-deck' }));
    expect(res.status).toBe(404);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('skips the scan for a group with no learners yet', async () => {
    setTable('groups', { id: 'group-1' });
    setTable('group_members', []);
    setTable('assignments', [{ deck_id: 'deck-1' }]);
    setTable('decks', [{ id: 'deck-1', name: 'Kanji Basics', emoji: '📘' }]);

    const body = await (await GET(makeRequest({ groupId: 'group-1' }))).json();
    expect(body).toEqual({
      learnerCount: 0,
      decks: [{ id: 'deck-1', name: 'Kanji Basics', emoji: '📘' }],
      words: [],
    });
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('returns 500 when the scan fails', async () => {
    seedGroupWithOneDeck();
    rpcMock.mockResolvedValue({ data: null, error: { message: 'boom' } });
    expect((await GET(makeRequest({ groupId: 'group-1' }))).status).toBe(500);
  });
});
