import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { _resetStore } from '@/app/api/_lib/rateLimit';
import { DOCUMENT_MAX_BYTES } from '@/components/MaterialsBuilder/constants';

// ─── Mock requireOrganizerAccount to pass through ────────────────────────────

vi.mock('@/app/api/_lib/requireOrganizerAccount', () => ({
  requireOrganizerAccount: vi.fn().mockResolvedValue({
    id: 'org1',
    username: 'organizer',
    account_type: 'organizer',
  }),
}));

// ─── Mock the PDF's home in Storage ──────────────────────────────────────────

const { downloadMock } = vi.hoisted(() => ({ downloadMock: vi.fn() }));

vi.mock('@/app/api/group/_lib/serviceSupabase', () => ({
  getServiceSupabase: () => ({ storage: { from: () => ({ download: downloadMock }) } }),
}));

// ─── Mock fetch ───────────────────────────────────────────────────────────────

const mockFetch = vi.fn();
global.fetch = mockFetch;

const OWN_PATH = 'org1/2f1c1e0e-0000-4000-8000-000000000000.pdf';

beforeEach(() => {
  vi.clearAllMocks();
  _resetStore();
  process.env.GEMINI_API_KEY = 'test-gemini-key';
  downloadMock.mockResolvedValue({ data: new Blob(['test']), error: null });
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
  it('should return 400 when the path is missing', async () => {
    const req = makeRequest({});
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("should refuse a path under another user's prefix", async () => {
    const res = await POST(makeRequest({ path: 'org2/someone-elses.pdf' }));
    expect(res.status).toBe(400);
    expect(downloadMock).not.toHaveBeenCalled();
  });

  it('should refuse a path that climbs out of the prefix with ..', async () => {
    const res = await POST(makeRequest({ path: 'org1/../org2/someone-elses.pdf' }));
    expect(res.status).toBe(400);
    expect(downloadMock).not.toHaveBeenCalled();
  });

  it('should refuse a text upload — the bytes are sent to Gemini as a PDF', async () => {
    const res = await POST(makeRequest({ path: 'org1/vocab.txt' }));
    expect(res.status).toBe(400);
    expect(downloadMock).not.toHaveBeenCalled();
  });

  it('should ask for a re-upload when the object is gone', async () => {
    downloadMock.mockResolvedValueOnce({ data: null, error: { message: 'Object not found' } });

    const res = await POST(makeRequest({ path: OWN_PATH }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain('upload it again');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should reject a stored PDF that is over the size cap', async () => {
    downloadMock.mockResolvedValueOnce({
      data: { size: DOCUMENT_MAX_BYTES + 1, arrayBuffer: async () => new ArrayBuffer(0) },
      error: null,
    });

    const res = await POST(makeRequest({ path: OWN_PATH }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain('too large');
    expect(mockFetch).not.toHaveBeenCalled();
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
    const req = makeRequest({ path: OWN_PATH });
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

    const req = makeRequest({ path: OWN_PATH });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body[0].word).toBe('猫');
    expect(body[0].meaning).toBe('cat');
    expect(body[0].example_en).toBe('I like cats');

    // The bytes Gemini sees are the ones read back from Storage, encoded here.
    expect(downloadMock).toHaveBeenCalledWith(OWN_PATH);
    const sent = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(sent.contents[0].parts[0].inline_data.data).toBe('dGVzdA==');
  });

  it('should return 500 when Gemini throws', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Gemini down'));

    const req = makeRequest({ path: OWN_PATH });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it('should return Gemini error status when API call fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({ error: { message: 'Rate limit exceeded' } }),
    });

    const req = makeRequest({ path: OWN_PATH });
    const res = await POST(req);
    expect(res.status).toBe(429);
  });
});
