import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { _resetStore } from '@/app/api/_lib/rateLimit';
import { DOCUMENT_MAX_BYTES } from '@/components/MaterialsBuilder/constants';

const DOCUMENT_MAX_BASE64_CHARS = Math.ceil(DOCUMENT_MAX_BYTES / 3) * 4;

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

function nextResult(table: string): QueryResult {
  return queues[table]?.shift() ?? { data: [], error: null };
}

vi.mock('@/app/api/group/_lib/serviceSupabase', () => ({
  getServiceSupabase: () => ({
    // Budget is claimed by an RPC; the counter itself has its own test.
    rpc: () => Promise.resolve({ data: 1, error: null }),
    from(table: string) {
      const chain = {
        select: () => chain,
        eq: () => chain,
        gt: () => chain,
        in: () => chain,
        limit: () => chain,
        order: () => chain,
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

beforeEach(() => {
  vi.clearAllMocks();
  _resetStore();
  process.env.GEMINI_API_KEY = 'test-gemini-key';
  queues = { group_members: [], card_progress: [], cards: [] };
  inserted.length = 0;
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
      makeRequest({ ...VALID, documents: [{ base64: 'YWJj', mimeType: 'image/png' }] }),
    );
    expect(res.status).toBe(400);
  });

  it('rejects a malformed document entry instead of crashing', async () => {
    const res = await POST(makeRequest({ ...VALID, documents: [null] }));
    expect(res.status).toBe(400);
  });

  it('rejects a document over the per-file size cap', async () => {
    const res = await POST(
      makeRequest({
        ...VALID,
        documents: [
          { base64: 'a'.repeat(DOCUMENT_MAX_BASE64_CHARS + 1), mimeType: 'application/pdf' },
        ],
      }),
    );
    expect(res.status).toBe(400);
  });

  it('rejects documents whose combined size is over the total cap', async () => {
    const atPerFileCap = 'a'.repeat(DOCUMENT_MAX_BASE64_CHARS);
    const res = await POST(
      makeRequest({
        ...VALID,
        documents: [
          { base64: atPerFileCap, mimeType: 'application/pdf' },
          { base64: atPerFileCap, mimeType: 'application/pdf' },
          { base64: atPerFileCap, mimeType: 'application/pdf' },
        ],
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Combined reference documents are too large.');
  });

  it('sends each document to Gemini as its own inline data part alongside the prompt', async () => {
    mockGeminiPlan();

    const res = await POST(
      makeRequest({
        ...VALID,
        documents: [
          { base64: 'YWJj', mimeType: 'application/pdf' },
          { base64: 'ZGVm', mimeType: 'text/plain' },
        ],
      }),
    );
    expect(res.status).toBe(200);

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
});
