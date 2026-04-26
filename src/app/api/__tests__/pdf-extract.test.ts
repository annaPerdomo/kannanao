import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { _resetStore } from '@/app/api/_lib/rateLimit';

// ─── Mock requireOrganizerAccount to pass through ────────────────────────────

vi.mock('@/app/api/_lib/requireOrganizerAccount', () => ({
  requireOrganizerAccount: vi.fn().mockResolvedValue({
    id: 'org1',
    username: 'organizer',
    account_type: 'organizer',
  }),
}));

// ─── Mock fetch ───────────────────────────────────────────────────────────────

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  vi.clearAllMocks();
  _resetStore();
  process.env.GEMINI_API_KEY = 'test-gemini-key';
});

import { POST } from '@/app/api/pdf-extract/route';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/pdf-extract', {
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
      candidates: [{ content: { parts: [{ text: JSON.stringify(cards) }] } }],
    }),
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/pdf-extract', () => {
  it('should return 400 when pdfBase64 is missing', async () => {
    const req = makeRequest({});
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it('should return 400 when body is not valid JSON', async () => {
    const req = new NextRequest('http://localhost/api/pdf-extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('should return 500 when GEMINI_API_KEY is not set', async () => {
    delete process.env.GEMINI_API_KEY;
    const req = makeRequest({ pdfBase64: 'dGVzdA==' });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain('GEMINI_API_KEY');
  });

  it('should strip periods from card fields and return cards on success', async () => {
    mockGeminiSuccess([
      {
        word: '猫.',
        reading: 'ねこ.',
        meaning: 'cat.',
        image_query: 'cute cat',
        example_jp: '{猫|ねこ}が好きです',
        example_en: 'I like cats.',
        card_type: 'word',
        jlpt_level: 'N5',
      },
    ]);

    const req = makeRequest({ pdfBase64: 'dGVzdA==' });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body[0].word).toBe('猫');
    expect(body[0].meaning).toBe('cat');
    expect(body[0].example_en).toBe('I like cats');
  });

  it('should return 500 when Gemini throws', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Gemini down'));

    const req = makeRequest({ pdfBase64: 'dGVzdA==' });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it('should return Gemini error status when API call fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({ error: { message: 'Rate limit exceeded' } }),
    });

    const req = makeRequest({ pdfBase64: 'dGVzdA==' });
    const res = await POST(req);
    expect(res.status).toBe(429);
  });
});
