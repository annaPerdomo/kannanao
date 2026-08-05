import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { _resetStore } from '@/app/api/_lib/rateLimit';
import { DOCUMENT_MAX_BYTES } from '@/components/Group/LessonBuilder/constants';

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

/** A learner the organizer owns, so isMemberOfOrganizer passes. */
function memberExists() {
  queues.group_members.push({ data: [{ group_id: 'g1' }], error: null });
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

const VALID = { memberId: 'm1', goal: 'Food words for a restaurant', weeks: 2, cardsPerDeck: 10 };

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

  it('rejects a learner outside the caller’s group', async () => {
    queues.group_members.push({ data: [], error: null });
    const res = await POST(makeRequest(VALID));
    expect(res.status).toBe(403);
  });

  it('returns the plan and writes nothing', async () => {
    memberExists();
    mockGeminiPlan();

    const res = await POST(makeRequest(VALID));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.plan.decks).toHaveLength(1);
    expect(body.plan.decks[0].cards[0].word).toBe('ラーメン');
    expect(inserted).toHaveLength(0);
  });

  it('reports a Gemini failure as 502', async () => {
    memberExists();
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({ error: { message: 'Rate limit exceeded' } }),
    });

    const res = await POST(makeRequest(VALID));
    expect(res.status).toBe(502);
  });

  it('reports an empty plan rather than returning it', async () => {
    memberExists();
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
    memberExists();
    const res = await POST(
      makeRequest({ ...VALID, documentBase64: 'YWJj', documentMimeType: 'image/png' }),
    );
    expect(res.status).toBe(400);
  });

  it('rejects a document over the size cap', async () => {
    memberExists();
    const res = await POST(
      makeRequest({
        ...VALID,
        documentBase64: 'a'.repeat(DOCUMENT_MAX_BASE64_CHARS + 1),
        documentMimeType: 'application/pdf',
      }),
    );
    expect(res.status).toBe(400);
  });

  it('sends the document to Gemini as inline data alongside the prompt', async () => {
    memberExists();
    mockGeminiPlan();

    const res = await POST(
      makeRequest({
        ...VALID,
        documentBase64: 'YWJj',
        documentMimeType: 'application/pdf',
      }),
    );
    expect(res.status).toBe(200);

    const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    const parts = requestBody.contents[0].parts;
    expect(parts[0]).toEqual({
      inline_data: { mime_type: 'application/pdf', data: 'YWJj' },
    });
    expect(parts[1].text).toContain('reference document is attached');
  });
});
