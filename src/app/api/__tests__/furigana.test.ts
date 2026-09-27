import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { _resetStore } from '@/app/api/_lib/rateLimit';
import type * as KanjiReadings from '@/lib/kanjiReadings';

// ─── Mock requireOrganizerAccount to pass through ────────────────────────────

vi.mock('@/app/api/_lib/requireOrganizerAccount', () => ({
  requireOrganizerAccount: vi.fn().mockResolvedValue({
    id: 'org1',
    username: 'organizer',
    account_type: 'organizer',
  }),
}));

// ─── Mock the kanji reading dictionary, real by default ──────────────────────

vi.mock('@/lib/kanjiReadings', async (importActual) => {
  const actual = await importActual<typeof KanjiReadings>();
  return { ...actual, loadKanjiReadings: vi.fn(actual.loadKanjiReadings) };
});

// ─── Mock fetch ───────────────────────────────────────────────────────────────

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  vi.clearAllMocks();
  _resetStore();
  process.env.GEMINI_API_KEY = 'test-gemini-key';
});

import { POST } from '@/app/api/furigana/route';
import { loadKanjiReadings } from '@/lib/kanjiReadings';

const mockLoadKanjiReadings = vi.mocked(loadKanjiReadings);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/furigana', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function mockGeminiSuccess(lines: string[]) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => ({
      candidates: [
        {
          content: {
            parts: [{ text: JSON.stringify({ lines }) }],
          },
        },
      ],
    }),
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/furigana', () => {
  it('should return 400 when lines is empty', async () => {
    const req = makeRequest({ lines: [] });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it('should return 400 when lines is missing', async () => {
    const req = makeRequest({});
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('should return 400 when body is not valid JSON', async () => {
    const req = new NextRequest('http://localhost/api/furigana', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('should return 500 when GEMINI_API_KEY is not set', async () => {
    delete process.env.GEMINI_API_KEY;
    const req = makeRequest({ lines: ['わたしはねこがすきです'] });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it('should return annotated lines on success', async () => {
    mockGeminiSuccess(['{私|わたし}は{猫|ねこ}が好きです']);

    const req = makeRequest({ lines: ['わたしはねこがすきです'] });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.lines).toBeDefined();
    expect(Array.isArray(body.lines)).toBe(true);
    expect(body.lines[0]).toContain('{');
  });

  it('should preserve the number of output lines matching input', async () => {
    const inputLines = ['ねこがすきです', 'いぬがいます'];
    mockGeminiSuccess(['{猫|ねこ}が好きです', '{犬|いぬ}がいます']);

    const req = makeRequest({ lines: inputLines });
    const res = await POST(req);
    const body = await res.json();

    expect(body.lines).toHaveLength(2);
  });

  it('should return 500 when Gemini throws', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Gemini down'));

    const req = makeRequest({ lines: ['ねこ'] });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it('splits a word-level compound into one reading per kanji', async () => {
    mockGeminiSuccess(['{駐車|ちゅうしゃ}は{今日|きょう}']);

    const req = makeRequest({ lines: ['ちゅうしゃはきょう'] });
    const res = await POST(req);
    const body = await res.json();

    expect(body.lines[0]).toBe('{駐|ちゅう}{車|しゃ}は{今日|きょう}');
  });

  it('still returns 200 when the kanji reading dictionary fails to load', async () => {
    mockLoadKanjiReadings.mockRejectedValueOnce(new Error('boom'));
    mockGeminiSuccess(['{駐車|ちゅうしゃ}は{今日|きょう}']);

    const req = makeRequest({ lines: ['ちゅうしゃはきょう'] });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.lines[0]).toBe('{駐車|ちゅうしゃ}は{今日|きょう}');
  });
});
