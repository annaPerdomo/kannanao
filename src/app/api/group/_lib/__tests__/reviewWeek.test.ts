import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CARD_COPY_COLUMNS } from '@/lib/cardCopyColumns';

const {
  assignHandoutMock,
  removeHandoutMock,
  linkWeekToUnitMock,
  memberIdsForMock,
  pickReviewCardsMock,
} = vi.hoisted(() => ({
  assignHandoutMock: vi.fn(),
  removeHandoutMock: vi.fn(),
  linkWeekToUnitMock: vi.fn(),
  memberIdsForMock: vi.fn(),
  pickReviewCardsMock: vi.fn(),
}));

vi.mock('../handoutWrites', () => ({
  assignHandout: (...args: unknown[]) => assignHandoutMock(...args),
  removeHandout: (...args: unknown[]) => removeHandoutMock(...args),
}));
vi.mock('../linkWeekToUnit', () => ({
  linkWeekToUnit: (...args: unknown[]) => linkWeekToUnitMock(...args),
}));
vi.mock('../membership', () => ({
  memberIdsFor: (...args: unknown[]) => memberIdsForMock(...args),
}));
vi.mock('@/lib/lessonReview', () => ({
  pickReviewCards: (...args: unknown[]) => pickReviewCardsMock(...args),
}));

import { buildReviewWeek, clampReviewCardCount } from '../reviewWeek';

interface Result {
  data?: unknown;
  error?: unknown;
}

const queues: Record<string, Result[]> = {};
function queue(table: string, ...results: Result[]) {
  queues[table] = [...results];
}
function takeResult(table: string): Result {
  const q = queues[table];
  if (!q || q.length === 0) return { data: null, error: null };
  if (q.length === 1) return q[0];
  return q.shift() as Result;
}

const insertCalls: { table: string; rows: unknown }[] = [];
const deleteCalls: string[] = [];
const inCalls: { table: string; args: unknown[] }[] = [];
const orderCalls: { table: string; args: unknown[] }[] = [];
const rpcMock = vi.fn().mockResolvedValue({ data: [], error: null });

function makeChain(table: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: Record<string, any> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.in = vi.fn((...args: unknown[]) => {
    inCalls.push({ table, args });
    return chain;
  });
  chain.order = vi.fn((...args: unknown[]) => {
    orderCalls.push({ table, args });
    return chain;
  });
  chain.limit = vi.fn(() => chain);
  chain.single = vi.fn(() => Promise.resolve(takeResult(table)));
  chain.maybeSingle = vi.fn(() => Promise.resolve(takeResult(table)));
  chain.insert = vi.fn((rows: unknown) => {
    insertCalls.push({ table, rows });
    return chain;
  });
  chain.delete = vi.fn(() => {
    deleteCalls.push(table);
    return chain;
  });
  chain.then = (onf: (v: unknown) => unknown, onr?: (e: unknown) => unknown) =>
    Promise.resolve(takeResult(table)).then(onf, onr);
  return chain;
}

function makeSb() {
  return {
    from: (table: string) => makeChain(table),
    rpc: (...args: unknown[]) => rpcMock(...args),
  } as unknown as Parameters<typeof buildReviewWeek>[0]['sb'];
}

const ORGANIZER = {
  id: 'org1',
  username: 'teacher',
  account_type: 'organizer' as const,
  display_name: 'Teacher',
};
const GROUP = {
  id: 'g1',
  organizer_id: 'org1',
  name: 'Group',
  emoji: '🎌',
  pinned: false,
  created_at: '',
};

function card(id: string, deck_id: string, word: string, overrides: Record<string, unknown> = {}) {
  return { id, deck_id, word, ...overrides };
}

const BASE_ARGS = {
  organizer: ORGANIZER,
  group: GROUP,
  planId: 'plan1',
  planTitle: 'My Unit',
  unitDeckIds: ['d1', 'd2'],
  nextPosition: 2,
  dueDate: '2026-10-20',
  availableOn: '2026-10-13',
  maxCards: 30,
};

describe('clampReviewCardCount', () => {
  it('clamps to the 10-40 range and falls back for non-integers', () => {
    expect(clampReviewCardCount(5, 30)).toBe(10);
    expect(clampReviewCardCount(100, 30)).toBe(40);
    expect(clampReviewCardCount(25, 30)).toBe(25);
    expect(clampReviewCardCount('x', 30)).toBe(30);
    expect(clampReviewCardCount(undefined, 30)).toBe(30);
  });
});

describe('buildReviewWeek', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(queues)) delete queues[key];
    insertCalls.length = 0;
    deleteCalls.length = 0;
    inCalls.length = 0;
    orderCalls.length = 0;
    rpcMock.mockReset().mockResolvedValue({ data: [], error: null });
    memberIdsForMock.mockResolvedValue(['m1']);
    assignHandoutMock.mockResolvedValue({ error: null });
    removeHandoutMock.mockResolvedValue({ error: null });
    linkWeekToUnitMock.mockResolvedValue({ status: 'ok' });
    pickReviewCardsMock.mockImplementation((args: { cards: unknown[] }) => args.cards);
  });

  function queueHappyPath(cards: ReturnType<typeof card>[]) {
    queue(
      'decks',
      { data: [{ id: 'd1' }] },
      { data: { position: 5 } },
      { data: { id: 'review-deck' } },
    );
    queue('cards', { data: cards });
  }

  it('returns no_cards when none of the unit decks are still owned by the organizer', async () => {
    queue('decks', { data: [] });
    const result = await buildReviewWeek({ sb: makeSb(), ...BASE_ARGS });
    expect(result).toEqual({ status: 'no_cards' });
    expect(insertCalls).toHaveLength(0);
  });

  it('only pulls cards from verified decks, ordered by deck then position before the week-order sort', async () => {
    queueHappyPath([card('c1', 'd1', 'A')]);

    await buildReviewWeek({ sb: makeSb(), ...BASE_ARGS });

    const cardsIn = inCalls.find((c) => c.table === 'cards');
    expect(cardsIn?.args[1]).toEqual(['d1']);
    const cardsOrder = orderCalls.filter((c) => c.table === 'cards').map((c) => c.args[0]);
    expect(cardsOrder).toEqual(['deck_id', 'position']);
  });

  it('copies every CARD_COPY_COLUMNS field plus deck_id and position, nothing else', async () => {
    queueHappyPath([
      card('c1', 'd1', 'A', {
        reading: 'ア',
        romaji: 'a',
        meaning: 'a',
        image_url: null,
        image_credit: 'photographer',
        image_query: '',
        example_jp: null,
        example_en: null,
        main_view_mode: 'hiragana',
        card_type: 'word',
        jlpt_level: null,
      }),
    ]);

    await buildReviewWeek({ sb: makeSb(), ...BASE_ARGS });

    const cardsInsert = insertCalls.find((c) => c.table === 'cards');
    const row = (cardsInsert?.rows as Record<string, unknown>[])[0];
    expect(Object.keys(row).sort()).toEqual([...CARD_COPY_COLUMNS, 'deck_id', 'position'].sort());
    expect(row.image_credit).toBe('photographer');
    expect(row.romaji).toBe('a');
    expect(row.card_type).toBe('word');
  });

  it('never sets lesson_plan_id on the created deck', async () => {
    queueHappyPath([card('c1', 'd1', 'A')]);
    await buildReviewWeek({ sb: makeSb(), ...BASE_ARGS });
    const deckInsert = insertCalls.find((c) => c.table === 'decks');
    expect(deckInsert?.rows).not.toHaveProperty('lesson_plan_id');
  });

  it('survives a group_difficult_words RPC error and still builds the week', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'rpc down' } });
    queueHappyPath([card('c1', 'd1', 'A')]);

    const result = await buildReviewWeek({ sb: makeSb(), ...BASE_ARGS });
    expect(result).toEqual({ status: 'ok', deckId: 'review-deck' });
    const pickedArgs = pickReviewCardsMock.mock.calls[0][0] as { trickyCardIds: string[] };
    expect(pickedArgs.trickyCardIds).toEqual([]);
  });

  it('rolls back (handout, cards, deck) when the cards insert fails after the deck is created', async () => {
    queue(
      'decks',
      { data: [{ id: 'd1' }] },
      { data: { position: 5 } },
      { data: { id: 'review-deck' } },
    );
    queue('cards', { data: [card('c1', 'd1', 'A')] }, { error: { message: 'insert failed' } });

    const result = await buildReviewWeek({ sb: makeSb(), ...BASE_ARGS });

    expect(result).toEqual({ status: 'error' });
    expect(removeHandoutMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ organizerId: 'org1', groupId: 'g1', deckId: 'review-deck' }),
    );
    expect(deleteCalls).toContain('cards');
    expect(deleteCalls).toContain('decks');
  });

  it('rolls back when assignHandout fails', async () => {
    queueHappyPath([card('c1', 'd1', 'A')]);
    assignHandoutMock.mockResolvedValue({ error: 'boom' });

    const result = await buildReviewWeek({ sb: makeSb(), ...BASE_ARGS });
    expect(result).toEqual({ status: 'error' });
    expect(removeHandoutMock).toHaveBeenCalled();
    expect(deleteCalls).toContain('cards');
    expect(deleteCalls).toContain('decks');
  });

  it('rolls back and surfaces "conflict" (not "error") when the link insert collides, so a retry never duplicates the quiz', async () => {
    queueHappyPath([card('c1', 'd1', 'A')]);
    linkWeekToUnitMock.mockResolvedValue({ status: 'conflict' });

    const result = await buildReviewWeek({ sb: makeSb(), ...BASE_ARGS });
    expect(result).toEqual({ status: 'conflict' });
    expect(removeHandoutMock).toHaveBeenCalled();
    expect(deleteCalls).toContain('cards');
    expect(deleteCalls).toContain('decks');
  });
});
