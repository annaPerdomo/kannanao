import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Mock fetch ───────────────────────────────────────────────────────────────

const mockFetch = vi.fn();
global.fetch = mockFetch;

// ─── Setup env ────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  process.env.GEMINI_API_KEY = 'test-gemini-key';
});

import { POST } from '@/app/api/generate/route';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function mockGeminiSuccess(cards: unknown[]) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => ({
      candidates: [
        {
          content: {
            parts: [{ text: JSON.stringify(cards) }],
          },
        },
      ],
    }),
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/generate', () => {
  it('should return 400 when pendingWords is empty', async () => {
    const req = makeRequest({ pendingWords: [] });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it('should return 400 when pendingWords is missing', async () => {
    const req = makeRequest({});
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('should return 400 when body is not valid JSON', async () => {
    const req = new NextRequest('http://localhost/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('should return 400 when too many words are provided', async () => {
    const req = makeRequest({ pendingWords: Array.from({ length: 51 }, (_, i) => `word${i}`) });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('max 50');
  });

  it('should return 500 when GEMINI_API_KEY is not set', async () => {
    delete process.env.GEMINI_API_KEY;
    const req = makeRequest({ pendingWords: ['猫'] });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain('GEMINI_API_KEY');
  });

  it('should return generated cards array on success', async () => {
    const generatedCards = [
      {
        word: '猫',
        reading: 'ねこ',
        meaning: 'cat',
        image_query: 'cat',
        example_jp: '{猫|ねこ}が好きです',
        example_en: 'I like cats',
        card_type: 'word',
        jlpt_level: 'N5',
      },
    ];
    mockGeminiSuccess(generatedCards);

    const req = makeRequest({ pendingWords: ['猫'] });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(1);
    expect(body[0].word).toBe('猫');
    expect(body[0].reading).toBe('ねこ');
    expect(body[0].meaning).toBe('cat');
  });

  it('should return card with all required fields', async () => {
    const card = {
      word: '食べる',
      reading: 'たべる',
      meaning: 'to eat',
      image_query: 'eating food',
      example_jp: '{食|た}べます',
      example_en: 'I eat',
      card_type: 'word',
      jlpt_level: 'N5',
    };
    mockGeminiSuccess([card]);

    const req = makeRequest({ pendingWords: ['食べる'] });
    const res = await POST(req);
    const body = await res.json();

    expect(body[0]).toMatchObject({
      word: '食べる',
      reading: 'たべる',
      meaning: 'to eat',
    });
  });

  it('should return 500 when Gemini throws an Error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const req = makeRequest({ pendingWords: ['猫'] });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Network error');
  });

  it('should return generic message when a non-Error is thrown', async () => {
    mockFetch.mockRejectedValueOnce('unexpected string rejection');

    const req = makeRequest({ pendingWords: ['猫'] });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Internal server error');
  });
});
