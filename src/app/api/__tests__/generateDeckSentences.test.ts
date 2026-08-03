import { beforeEach, describe, expect, it, vi } from 'vitest';

type QueryResult = { data?: unknown; error?: { message: string } | null };

let queues: Record<string, QueryResult[]>;
let inserted: { table: string; rows: Record<string, unknown>[] }[];

function nextResult(table: string): QueryResult {
  return queues[table]?.shift() ?? { data: [], error: null };
}

vi.mock('@/app/api/group/_lib/serviceSupabase', () => ({
  getServiceSupabase: () => ({
    from(table: string) {
      const chain = {
        select: () => chain,
        eq: () => chain,
        is: () => chain,
        in: () => chain,
        limit: () => chain,
        order: () => chain,
        maybeSingle: () => Promise.resolve(nextResult(table)),
        insert: (rows: Record<string, unknown>[]) => {
          inserted.push({ table, rows });
          return Promise.resolve({ error: null });
        },
        then: (ok: (r: QueryResult) => unknown, err?: (e: unknown) => unknown) =>
          Promise.resolve(nextResult(table)).then(ok, err),
      };
      return chain;
    },
  }),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

import { generateDeckSentences } from '@/app/api/group/_lib/generateDeckSentences';

const ARGS = {
  deckId: 'd1',
  memberId: null,
  knownWords: [],
  apiKey: 'key',
  ownerId: 'org1',
};

function ownDeck() {
  queues.decks.push({ data: { id: 'd1' }, error: null });
}

function withCards() {
  queues.cards.push({
    data: [{ id: 'c1', word: 'ねこ', reading: 'ねこ', meaning: 'cat' }],
    error: null,
  });
  // No existing set, then the post-insert re-fetch.
  queues.deck_practice_sentences.push({ data: [], error: null });
  queues.deck_practice_sentences.push({ data: [{ id: 's1' }], error: null });
}

function geminiReturns(sentences: Record<string, unknown>[]) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: JSON.stringify(sentences) }] } }],
    }),
  });
}

const sentence = (overrides: Record<string, unknown>) => ({
  sentence_jp: 'ねこがいます',
  sentence_en: 'There is a cat',
  target_particle: 'が',
  particle_index: 2,
  distractors: ['は'],
  sentence_type: 'statement',
  conversation_group: 1,
  sort_order: 1,
  source_words: ['ねこ'],
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  queues = { decks: [], cards: [], deck_practice_sentences: [] };
  inserted = [];
});

describe('generateDeckSentences', () => {
  it('refuses a deck the caller does not own', async () => {
    // The service client bypasses RLS, so ownership is checked here or nowhere.
    queues.decks.push({ data: null, error: null });

    const result = await generateDeckSentences(ARGS);

    expect(result).toMatchObject({ status: 'failed', httpStatus: 404 });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('renumbers sort_order so a repeated pair cannot reject the whole insert', async () => {
    // (deck, learner, conversation_group, sort_order) is unique in the DB and
    // both group and order come straight from the model.
    ownDeck();
    withCards();
    geminiReturns([
      sentence({ conversation_group: 1, sort_order: 1 }),
      sentence({ conversation_group: 1, sort_order: 1 }),
      sentence({ conversation_group: 2, sort_order: 5 }),
    ]);

    const result = await generateDeckSentences(ARGS);

    expect(result.status).toBe('generated');
    const rows = inserted.find((i) => i.table === 'deck_practice_sentences')!.rows;
    expect(rows.map((r) => [r.conversation_group, r.sort_order])).toEqual([
      [1, 0],
      [1, 1],
      [2, 0],
    ]);
  });

  it('keeps the model’s intended order within a conversation', async () => {
    ownDeck();
    withCards();
    geminiReturns([
      sentence({ sentence_en: 'second', conversation_group: 1, sort_order: 9 }),
      sentence({ sentence_en: 'first', conversation_group: 1, sort_order: 2 }),
    ]);

    await generateDeckSentences(ARGS);

    const rows = inserted.find((i) => i.table === 'deck_practice_sentences')!.rows;
    expect(rows.map((r) => r.sentence_en)).toEqual(['first', 'second']);
  });
});
