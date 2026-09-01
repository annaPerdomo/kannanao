import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { _resetStore } from '@/app/api/_lib/rateLimit';
import {
  DOCUMENT_MAX_BYTES,
  DOCUMENT_MAX_TOTAL_BYTES,
} from '@/components/MaterialsBuilder/constants';

vi.mock('@/app/api/_lib/requireOrganizerAccount', () => ({
  requireOrganizerAccount: vi.fn().mockResolvedValue({
    id: 'org1',
    username: 'organizer',
    account_type: 'organizer',
  }),
}));

type QueryResult = { data?: unknown; error?: { message: string } | null };

let queues: Record<string, QueryResult[]> = {};
const inserted: { table: string; rows: unknown }[] = [];
let fromCalls: string[] = [];

function nextResult(table: string): QueryResult {
  return queues[table]?.shift() ?? { data: [], error: null };
}

const { downloadMock, rpcMock } = vi.hoisted(() => ({
  downloadMock: vi.fn(),
  rpcMock: vi.fn(),
}));

vi.mock('@/app/api/group/_lib/serviceSupabase', () => ({
  getServiceSupabase: () => ({
    // Budget is claimed by an RPC; the counter itself has its own test.
    rpc: rpcMock,
    storage: { from: () => ({ download: downloadMock }) },
    from(table: string) {
      fromCalls.push(table);
      const chain = {
        select: () => chain,
        eq: () => chain,
        gt: () => chain,
        in: () => chain,
        limit: () => chain,
        order: () => chain,
        range: () => chain,
        single: () => Promise.resolve(nextResult(table)),
        maybeSingle: () => Promise.resolve(nextResult(table)),
        insert: (rows: unknown) => {
          inserted.push({ table, rows });
          return {
            select: () => chain,
            then: (ok: (r: unknown) => unknown) => ok({ error: null }),
          };
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

import { POST } from '@/app/api/group/lesson-plan/route';

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/group/lesson-plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function mockGeminiPlan() {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => ({
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  decks: [
                    {
                      name: 'Week 1',
                      description: 'Food words',
                      emoji: '🍜',
                      mainViewMode: 'hiragana',
                      cards: [
                        {
                          word: 'ラーメン',
                          reading: 'ラーメン',
                          meaning: 'ramen',
                          exampleJp: '{猫|ねこ}がラーメンをたべます',
                          exampleEn: 'The cat eats ramen',
                          jlptLevel: 'N5',
                        },
                      ],
                    },
                  ],
                }),
              },
            ],
          },
        },
      ],
    }),
  });
}

const VALID = { goal: 'Food words for a restaurant', weeks: 2, cardsPerDeck: 10 };

/** A path shaped the way the mint route hands them out: `<organizerId>/<uuid>.<ext>`. */
function ownPath(name: string) {
  return `org1/${name}`;
}

/** Stands in for a downloaded object without allocating megabytes of test data. */
function blobOfSize(bytes: number): Blob {
  return { size: bytes, arrayBuffer: async () => new ArrayBuffer(0) } as unknown as Blob;
}

function seedGroupAccess(groupId = 'g1') {
  queues.groups.push({ data: { id: groupId, organizer_id: 'org1' }, error: null });
}

function seedKnownWordsPool(args: {
  deckIds?: string[];
  plannedDeckIds?: string[];
  decks?: { id: string; name: string }[];
  cards?: {
    word: string;
    reading: string;
    meaning: string;
    deck_id: string;
    created_at?: string;
  }[];
}) {
  queues.assignments.push({
    data: (args.deckIds ?? []).map((id) => ({ deck_id: id })),
    error: null,
  });
  queues.planned_assignments.push({
    data: (args.plannedDeckIds ?? []).map((id) => ({ deck_id: id })),
    error: null,
  });
  queues.decks.push({ data: args.decks ?? [], error: null });
  queues.cards.push({ data: args.cards ?? [], error: null });
}

function mockGeminiPlanWithCards(cards: { word: string; reading: string; meaning: string }[]) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => ({
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  decks: [
                    {
                      name: 'Week 1',
                      description: 'Food words',
                      emoji: '🍜',
                      mainViewMode: 'hiragana',
                      cards: cards.map((c) => ({
                        ...c,
                        exampleJp: '{猫|ねこ}がラーメンをたべます',
                        exampleEn: 'The cat eats ramen',
                        jlptLevel: 'N5',
                      })),
                    },
                  ],
                }),
              },
            ],
          },
        },
      ],
    }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  _resetStore();
  process.env.GEMINI_API_KEY = 'test-gemini-key';
  queues = {
    group_members: [],
    card_progress: [],
    cards: [],
    groups: [],
    assignments: [],
    planned_assignments: [],
    decks: [],
  };
  inserted.length = 0;
  fromCalls = [];
  rpcMock.mockResolvedValue({ data: 1, error: null });
  downloadMock.mockResolvedValue({ data: new Blob(['abc']), error: null });
});

describe('POST /api/group/lesson-plan', () => {
  it('rejects a goal that is too short', async () => {
    const res = await POST(makeRequest({ ...VALID, goal: 'x' }));
    expect(res.status).toBe(400);
  });

  it('rejects a goal that is too long', async () => {
    const res = await POST(makeRequest({ ...VALID, goal: 'x'.repeat(501) }));
    expect(res.status).toBe(400);
  });

  it('rejects zero weeks and more than eight weeks', async () => {
    expect((await POST(makeRequest({ ...VALID, weeks: 0 }))).status).toBe(400);
    expect((await POST(makeRequest({ ...VALID, weeks: 9 }))).status).toBe(400);
  });

  it('rejects an out-of-range cardsPerDeck', async () => {
    expect((await POST(makeRequest({ ...VALID, cardsPerDeck: 50 }))).status).toBe(400);
    expect((await POST(makeRequest({ ...VALID, cardsPerDeck: 1 }))).status).toBe(400);
  });

  it('rejects an unknown JLPT level', async () => {
    const res = await POST(makeRequest({ ...VALID, level: 'N6' }));
    expect(res.status).toBe(400);
  });

  it('rejects style notes over the length cap', async () => {
    const res = await POST(makeRequest({ ...VALID, styleNotes: 'x'.repeat(301) }));
    expect(res.status).toBe(400);
  });

  it('pitches the prompt at the requested level and includes the style notes', async () => {
    mockGeminiPlan();

    const res = await POST(
      makeRequest({ ...VALID, level: 'N2', styleNotes: 'Business settings, polite form' }),
    );
    expect(res.status).toBe(200);

    const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    const prompt = requestBody.contents[0].parts[0].text;
    expect(prompt).toContain('upper-intermediate learner');
    expect(prompt).toContain('Business settings, polite form');
  });

  it('always asks Gemini for an imageQuery per card, so one is ready even if images are off', async () => {
    mockGeminiPlan();

    const res = await POST(makeRequest(VALID));
    expect(res.status).toBe(200);

    const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    const cardSchema =
      requestBody.generationConfig.response_schema.properties.decks.items.properties.cards.items;
    expect(cardSchema.properties.imageQuery).toEqual({ type: 'string' });
    expect(cardSchema.required).toContain('imageQuery');
  });

  it('returns the plan and writes nothing', async () => {
    mockGeminiPlan();

    const res = await POST(makeRequest(VALID));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.plan.decks).toHaveLength(1);
    expect(body.plan.decks[0].cards[0].word).toBe('ラーメン');
    expect(inserted).toHaveLength(0);
  });

  it('reports a Gemini failure as 502', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({ error: { message: 'Rate limit exceeded' } }),
    });

    const res = await POST(makeRequest(VALID));
    expect(res.status).toBe(502);
  });

  it('reports an empty plan rather than returning it', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: JSON.stringify({ decks: [] }) }] } }],
      }),
    });

    const res = await POST(makeRequest(VALID));
    expect(res.status).toBe(502);
  });

  it('rejects a document mime type that is not a PDF or plain text file', async () => {
    const res = await POST(
      makeRequest({ ...VALID, documents: [{ path: ownPath('a.png'), mimeType: 'image/png' }] }),
    );
    expect(res.status).toBe(400);
    expect(downloadMock).not.toHaveBeenCalled();
  });

  it('rejects a malformed document entry instead of crashing', async () => {
    const res = await POST(makeRequest({ ...VALID, documents: [null] }));
    expect(res.status).toBe(400);
  });

  it("refuses a path under another organizer's prefix", async () => {
    const res = await POST(
      makeRequest({
        ...VALID,
        documents: [{ path: 'org2/secret.pdf', mimeType: 'application/pdf' }],
      }),
    );
    expect(res.status).toBe(400);
    expect(downloadMock).not.toHaveBeenCalled();
  });

  it('refuses a path that climbs out of the prefix with ..', async () => {
    const res = await POST(
      makeRequest({
        ...VALID,
        documents: [{ path: 'org1/../org2/secret.pdf', mimeType: 'application/pdf' }],
      }),
    );
    expect(res.status).toBe(400);
    expect(downloadMock).not.toHaveBeenCalled();
  });

  it('refuses more documents than one request may download', async () => {
    const documents = Array.from({ length: 25 }, (_, i) => ({
      path: ownPath(`doc-${i}.pdf`),
      mimeType: 'application/pdf',
    }));

    const res = await POST(makeRequest({ ...VALID, documents }));
    expect(res.status).toBe(400);
    expect(downloadMock).not.toHaveBeenCalled();
  });

  it('rejects a stored document that turns out to be over the per-file cap', async () => {
    downloadMock.mockResolvedValueOnce({ data: blobOfSize(DOCUMENT_MAX_BYTES + 1), error: null });

    const res = await POST(
      makeRequest({
        ...VALID,
        documents: [{ path: ownPath('big.pdf'), mimeType: 'application/pdf' }],
      }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('A reference document is too large.');
  });

  it('rejects documents whose combined size is over the total cap', async () => {
    downloadMock.mockResolvedValue({ data: blobOfSize(DOCUMENT_MAX_BYTES), error: null });

    const res = await POST(
      makeRequest({
        ...VALID,
        documents: [
          { path: ownPath('a.pdf'), mimeType: 'application/pdf' },
          { path: ownPath('b.pdf'), mimeType: 'application/pdf' },
        ],
      }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Combined reference documents are too large.');
  });

  it('asks the organizer to re-attach a document that is no longer in storage', async () => {
    downloadMock.mockResolvedValueOnce({ data: null, error: { message: 'Object not found' } });

    const res = await POST(
      makeRequest({
        ...VALID,
        documents: [{ path: ownPath('gone.pdf'), mimeType: 'application/pdf' }],
      }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain('attach it again');
    // Nothing was generated, so the day's allowance must be untouched.
    expect(rpcMock).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('sends each document to Gemini as its own inline data part alongside the prompt', async () => {
    mockGeminiPlan();
    downloadMock
      .mockResolvedValueOnce({ data: new Blob(['abc']), error: null })
      .mockResolvedValueOnce({ data: new Blob(['def']), error: null });

    const res = await POST(
      makeRequest({
        ...VALID,
        documents: [
          { path: ownPath('vocab.pdf'), mimeType: 'application/pdf' },
          { path: ownPath('syllabus.txt'), mimeType: 'text/plain' },
        ],
      }),
    );
    expect(res.status).toBe(200);

    expect(downloadMock).toHaveBeenNthCalledWith(1, ownPath('vocab.pdf'));
    const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    const parts = requestBody.contents[0].parts;
    expect(parts[0]).toEqual({
      inline_data: { mime_type: 'application/pdf', data: 'YWJj' },
    });
    expect(parts[1]).toEqual({
      inline_data: { mime_type: 'text/plain', data: 'ZGVm' },
    });
    expect(parts[2].text).toContain('2 reference documents are attached');
  });

  it('accepts documents that together sit just under the combined cap', async () => {
    mockGeminiPlan();
    downloadMock.mockResolvedValue({
      data: blobOfSize(Math.floor(DOCUMENT_MAX_TOTAL_BYTES / 2)),
      error: null,
    });

    const res = await POST(
      makeRequest({
        ...VALID,
        documents: [
          { path: ownPath('a.pdf'), mimeType: 'application/pdf' },
          { path: ownPath('b.pdf'), mimeType: 'application/pdf' },
        ],
      }),
    );
    expect(res.status).toBe(200);
  });
});

describe('POST /api/group/lesson-plan — group known-words dedupe', () => {
  it('excludes the KNOWN VOCABULARY prompt block and filters cards into warmUp when given a groupId', async () => {
    seedGroupAccess();
    seedKnownWordsPool({
      deckIds: ['d1'],
      decks: [{ id: 'd1', name: 'Animals' }],
      cards: [
        { word: 'ねこ', reading: 'ねこ', meaning: 'cat', deck_id: 'd1', created_at: '2026-01-01' },
      ],
    });
    mockGeminiPlanWithCards([
      { word: 'ねこ', reading: 'ねこ', meaning: 'cat' },
      { word: 'ラーメン', reading: 'ラーメン', meaning: 'ramen' },
    ]);

    const res = await POST(makeRequest({ ...VALID, groupId: 'g1' }));
    expect(res.status).toBe(200);

    const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    const prompt = requestBody.contents[0].parts[0].text;
    expect(prompt).toContain('KNOWN VOCABULARY — words this group has already studied');
    expect(prompt).toContain('Do NOT create cards');

    const body = await res.json();
    expect(body.plan.decks[0].cards.map((c: { word: string }) => c.word)).toEqual(['ラーメン']);
    expect(body.warmUp).toEqual([
      { word: 'ねこ', reading: 'ねこ', meaning: 'cat', deckName: 'Animals', addedAt: '2026-01-01' },
    ]);
    expect(body.knownWords).toEqual([
      { word: 'ねこ', reading: 'ねこ', meaning: 'cat', deckName: 'Animals', addedAt: '2026-01-01' },
    ]);
  });

  it('skips the pool and the KNOWN VOCABULARY block when no groupId is given', async () => {
    mockGeminiPlan();

    const res = await POST(makeRequest(VALID));
    expect(res.status).toBe(200);

    expect(fromCalls).not.toContain('assignments');
    expect(fromCalls).not.toContain('planned_assignments');

    const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    const prompt = requestBody.contents[0].parts[0].text;
    expect(prompt).not.toContain('KNOWN VOCABULARY');

    const body = await res.json();
    expect(body.warmUp).toEqual([]);
  });

  it('returns 500 and never spends the budget when the pool query fails', async () => {
    seedGroupAccess();
    queues.assignments.push({ data: null, error: { message: 'boom' } });

    const res = await POST(makeRequest({ ...VALID, groupId: 'g1' }));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("Could not load the group's existing words.");
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('caps the prompt pool at 120 but still filters a match beyond the cap', async () => {
    seedGroupAccess();
    const cards = Array.from({ length: 121 }, (_, i) => ({
      word: `word${i}`,
      reading: `reading${i}`,
      meaning: `meaning${i}`,
      deck_id: 'd1',
    }));
    seedKnownWordsPool({
      deckIds: ['d1'],
      decks: [{ id: 'd1', name: 'Big Deck' }],
      cards,
    });
    mockGeminiPlanWithCards([{ word: 'word120', reading: 'reading120', meaning: 'meaning120' }]);

    const res = await POST(makeRequest({ ...VALID, groupId: 'g1' }));
    expect(res.status).toBe(200);

    const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    const prompt = requestBody.contents[0].parts[0].text;
    expect(prompt.match(/\(reading\d+\)/g) ?? []).toHaveLength(120);
    expect(prompt).toContain('(reading119)');
    expect(prompt).not.toContain('(reading120)');

    const body = await res.json();
    expect(body.plan.decks[0].cards).toHaveLength(0);
    expect(body.warmUp).toEqual([
      { word: 'word120', reading: 'reading120', meaning: 'meaning120', deckName: 'Big Deck' },
    ]);
  });

  it('returns 404 for a group the organizer does not own', async () => {
    queues.groups.push({ data: null, error: { message: 'not found' } });

    const res = await POST(makeRequest({ ...VALID, groupId: 'missing-group' }));
    expect(res.status).toBe(404);
    expect(rpcMock).not.toHaveBeenCalled();
  });
});
