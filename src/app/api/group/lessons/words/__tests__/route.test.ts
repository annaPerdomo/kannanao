import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { _resetStore } from '@/app/api/_lib/rateLimit';

const { requireGroupAccessMock, memberIdsForMock } = vi.hoisted(() => ({
  requireGroupAccessMock: vi.fn(),
  memberIdsForMock: vi.fn(),
}));

vi.mock('@/app/api/group/_lib/requireGroupAccess', () => ({
  requireGroupAccess: (...args: unknown[]) => requireGroupAccessMock(...args),
}));

vi.mock('@/app/api/group/_lib/membership', () => ({
  memberIdsFor: (...args: unknown[]) => memberIdsForMock(...args),
}));

const tableData: Record<string, { data: unknown; error: unknown }> = {};
function setTable(table: string, data: unknown, error: unknown = null) {
  tableData[table] = { data, error };
}

const cardProgressChain = vi.fn();
const decksChain = vi.fn();

function makeChain(table: string) {
  const asPromise = () => Promise.resolve(tableData[table] ?? { data: [], error: null });
  const chain: Record<string, unknown> = {};
  ['select', 'eq', 'in', 'order', 'range'].forEach((m) => {
    chain[m] = vi.fn((...args: unknown[]) => {
      if (table === 'card_progress') cardProgressChain(m, ...args);
      if (table === 'decks') decksChain(m, ...args);
      return chain;
    });
  });
  chain.single = vi.fn(() => Promise.resolve(tableData[table] ?? { data: null, error: null }));
  chain.then = (onfulfilled: (v: unknown) => unknown, onrejected?: (e: unknown) => unknown) =>
    asPromise().then(onfulfilled, onrejected);
  return chain;
}

vi.mock('@/app/api/group/_lib/serviceSupabase', () => ({
  getServiceSupabase: () => ({ from: (table: string) => makeChain(table) }),
}));

import { GET } from '@/app/api/group/lessons/words/route';

const ORGANIZER = {
  organizer: { id: 'org1', username: 'teacher', account_type: 'organizer' },
  group: { id: 'g1' },
};

function request(query: string) {
  return new NextRequest(`http://localhost/api/group/lessons/words?${query}`, { method: 'GET' });
}

function card(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    deck_id: 'd1',
    word: `word-${id}`,
    reading: null,
    meaning: null,
    image_url: null,
    image_query: null,
    example_jp: null,
    example_en: null,
    main_view_mode: 'hiragana',
    card_type: 'word',
    jlpt_level: null,
    position: 0,
    ...overrides,
  };
}

describe('GET /api/group/lessons/words', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetStore();
    for (const key of Object.keys(tableData)) delete tableData[key];
    requireGroupAccessMock.mockResolvedValue(ORGANIZER);
    memberIdsForMock.mockResolvedValue(['m1', 'm2']);
    setTable('decks', { id: 'd1', name: 'Food', emoji: '🍜' });
    setTable('cards', []);
    setTable('card_progress', []);
  });

  it('400s when groupId is missing', async () => {
    const res = await GET(request('deckId=d1'));
    expect(res.status).toBe(400);
  });

  it('400s when deckId is missing', async () => {
    const res = await GET(request('groupId=g1'));
    expect(res.status).toBe(400);
  });

  it('404s when the deck is owned by someone else', async () => {
    setTable('decks', null, { message: 'not found' });
    const res = await GET(request('groupId=g1&deckId=d1'));
    expect(res.status).toBe(404);
  });

  it('404s when memberId is outside the group', async () => {
    const res = await GET(request('groupId=g1&deckId=d1&memberId=stranger'));
    expect(res.status).toBe(404);
  });

  it('passes through a 404 from requireGroupAccess', async () => {
    requireGroupAccessMock.mockResolvedValue(
      NextResponse.json({ error: 'Group not found.' }, { status: 404 }),
    );
    const res = await GET(request('groupId=g1&deckId=d1'));
    expect(res.status).toBe(404);
  });

  it('returns words in deck order with counts, and learner null without memberId', async () => {
    setTable('cards', [card('c1'), card('c2')]);
    setTable('card_progress', [
      {
        user_id: 'm1',
        card_id: 'c1',
        correct_count: 5,
        wrong_count: 0,
        last_reviewed_at: '2026-10-01',
        next_review_at: '2026-10-05',
        interval_days: 3,
        ease: 2.5,
      },
    ]);

    const res = await GET(request('groupId=g1&deckId=d1'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.deck).toEqual({ id: 'd1', name: 'Food', emoji: '🍜' });
    expect(body.learnerCount).toBe(2);
    expect(body.words.map((w: { card: { id: string } }) => w.card.id)).toEqual(['c1', 'c2']);
    expect(body.words[0]).toMatchObject({ seenCount: 1, strongCount: 1, trickyCount: 0 });
    expect(body.learner).toBeNull();

    expect(decksChain).toHaveBeenCalledWith('eq', 'user_id', 'org1');
    expect(cardProgressChain).toHaveBeenCalledWith('in', 'user_id', ['m1', 'm2']);
    expect(cardProgressChain).toHaveBeenCalledWith('order', 'user_id', { ascending: true });
    expect(cardProgressChain).toHaveBeenCalledWith('order', 'card_id', { ascending: true });
  });

  it('fills learner when memberId is given', async () => {
    memberIdsForMock.mockResolvedValue(['m1', 'm2']);
    setTable('cards', [card('c1')]);
    setTable('card_progress', [
      {
        user_id: 'm1',
        card_id: 'c1',
        correct_count: 5,
        wrong_count: 0,
        last_reviewed_at: '2026-10-01',
        next_review_at: '2026-10-05',
        interval_days: 3,
        ease: 2.5,
      },
    ]);

    const res = await GET(request('groupId=g1&deckId=d1&memberId=m1'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.learner).toHaveLength(1);
    expect(body.learner[0]).toMatchObject({ strength: 'strong' });
  });

  it('skips the card_progress query when the group has no learners', async () => {
    memberIdsForMock.mockResolvedValue([]);
    setTable('cards', [card('c1')]);

    const res = await GET(request('groupId=g1&deckId=d1'));
    expect(res.status).toBe(200);
    expect(cardProgressChain).not.toHaveBeenCalled();
  });
});
