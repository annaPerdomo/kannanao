import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { _resetStore } from '@/app/api/_lib/rateLimit';

vi.mock('@/app/api/_lib/requireOrganizerAccount', () => ({
  requireOrganizerAccount: vi.fn().mockResolvedValue({
    id: 'org1',
    username: 'organizer',
    account_type: 'organizer',
  }),
}));

/* ── Supabase service-role stub ───────────────────────────────────────── */

type QueryResult = { data?: unknown; error?: { message: string } | null };

let queues: Record<string, QueryResult[]> = {};
let inserted: { table: string; rows: unknown[] }[] = [];

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
        gt: () => chain,
        in: () => chain,
        limit: () => chain,
        order: () => chain,
        maybeSingle: () => Promise.resolve(nextResult(table)),
        insert: (rows: unknown[]) => {
          inserted.push({ table, rows });
          return Promise.resolve({ error: null });
        },
        then: (onOk: (r: QueryResult) => unknown, onErr?: (e: unknown) => unknown) =>
          Promise.resolve(nextResult(table)).then(onOk, onErr),
      };
      return chain;
    },
  }),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

import { POST } from '@/app/api/group/practice-sentences/batch/route';

/* ── Helpers ──────────────────────────────────────────────────────────── */

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/group/practice-sentences/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function card(word: string) {
  return { id: `card-${word}`, word, reading: word, meaning: `${word} meaning` };
}

/** Each deck consumes: existing-set check, then the post-insert re-fetch. */
function queueDeck(cards: ReturnType<typeof card>[]) {
  queues.cards.push({ data: cards, error: null });
  queues.deck_practice_sentences.push({ data: [], error: null });
  queues.deck_practice_sentences.push({ data: [{ id: 's1' }], error: null });
}

function mockGeminiSuccess() {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => ({
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify([
                  {
                    sentence_jp: 'ねこがいます',
                    sentence_en: 'There is a cat',
                    target_particle: 'が',
                    particle_index: 2,
                    distractors: ['は', 'を'],
                    sentence_type: 'statement',
                    conversation_group: 1,
                    sort_order: 1,
                    source_words: ['ねこ'],
                  },
                ]),
              },
            ],
          },
        },
      ],
    }),
  });
}

function promptFromCall(index: number): string {
  const body = JSON.parse(mockFetch.mock.calls[index][1].body as string);
  return body.contents[0].parts[0].text as string;
}

beforeEach(() => {
  vi.clearAllMocks();
  _resetStore();
  process.env.GEMINI_API_KEY = 'test-gemini-key';
  queues = { cards: [], deck_practice_sentences: [], profiles: [], card_progress: [] };
  inserted = [];
});

/* ── Tests ────────────────────────────────────────────────────────────── */

describe('POST /api/group/practice-sentences/batch', () => {
  it('rejects a missing or empty deckIds list', async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it('rejects more than six decks', async () => {
    const res = await POST(makeRequest({ deckIds: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain('at most 6');
  });

  it('reports a failed deck without dropping the others', async () => {
    queueDeck([card('ねこ')]);
    queueDeck([card('いぬ')]);

    mockGeminiSuccess();
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({ error: { message: 'Rate limit exceeded' } }),
    });

    const res = await POST(makeRequest({ deckIds: ['deck-1', 'deck-2'] }));
    expect(res.status).toBe(200);

    const { results } = await res.json();
    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({ deckId: 'deck-1', status: 'generated' });
    expect(results[1]).toMatchObject({ deckId: 'deck-2', status: 'failed' });
    expect(results[1].error).toBeTruthy();
  });

  it("feeds deck 1's words into deck 2's prompt", async () => {
    queueDeck([card('ねこ')]);
    queueDeck([card('いぬ')]);
    mockGeminiSuccess();
    mockGeminiSuccess();

    await POST(makeRequest({ deckIds: ['deck-1', 'deck-2'] }));

    expect(promptFromCall(0)).not.toContain('KNOWN VOCABULARY');

    const second = promptFromCall(1);
    expect(second).toContain('KNOWN VOCABULARY');
    expect(second).toContain('ねこ');
  });

  it('stores the shared set with a null learner when no memberId is given', async () => {
    queueDeck([card('ねこ')]);
    mockGeminiSuccess();

    await POST(makeRequest({ deckIds: ['deck-1'] }));

    const rows = inserted[0].rows as { for_member_id: string | null; deck_id: string }[];
    expect(rows[0].for_member_id).toBeNull();
    expect(rows[0].deck_id).toBe('deck-1');
  });

  it('rejects a learner who is not in the organizer’s group', async () => {
    queues.profiles.push({ data: null, error: null });

    const res = await POST(makeRequest({ deckIds: ['deck-1'], memberId: 'stranger' }));
    expect(res.status).toBe(403);
  });
});
