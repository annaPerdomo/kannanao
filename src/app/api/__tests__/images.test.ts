import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { _resetStore } from '@/app/api/_lib/rateLimit';

// ─── Mock fetch ───────────────────────────────────────────────────────────────

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  vi.clearAllMocks();
  _resetStore();
  process.env.UNSPLASH_ACCESS_KEY = 'test-unsplash-key';
});

import { GET } from '@/app/api/images/route';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(query?: string) {
  const url = query
    ? `http://localhost/api/images?query=${encodeURIComponent(query)}`
    : 'http://localhost/api/images';
  return new NextRequest(url);
}

function mockUnsplashSuccess() {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => ({
      results: [
        {
          urls: { regular: 'https://images.unsplash.com/photo-cat' },
          links: {
            download_location: 'https://api.unsplash.com/photos/cat/download',
            html: 'https://unsplash.com/photos/cat',
          },
          user: {
            name: 'Jane Photographer',
            links: { html: 'https://unsplash.com/@jane' },
          },
        },
      ],
    }),
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GET /api/images', () => {
  it('should return 400 when query param is missing', async () => {
    const req = makeRequest();
    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it('should return an image result on success', async () => {
    mockUnsplashSuccess();

    const req = makeRequest('cat');
    const res = await GET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.result).toBeDefined();
    expect(body.result.url).toBe('https://images.unsplash.com/photo-cat');
    expect(body.result.photographerName).toBe('Jane Photographer');
  });

  it('should include photographer attribution in result', async () => {
    mockUnsplashSuccess();

    const req = makeRequest('cat');
    const res = await GET(req);
    const body = await res.json();

    expect(body.result.photographerName).toBeDefined();
    expect(body.result.photographerUrl).toBeDefined();
    expect(body.result.photoPageUrl).toBeDefined();
  });

  it('should return result: null when Unsplash returns empty results', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ results: [] }),
    });

    const req = makeRequest('noresults12345xyz');
    const res = await GET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.result).toBeNull();
  });

  it('should return 500 when UNSPLASH_ACCESS_KEY is not set', async () => {
    delete process.env.UNSPLASH_ACCESS_KEY;

    const req = makeRequest('cat');
    const res = await GET(req);
    expect(res.status).toBe(500);
  });

  it('should return 502 when Unsplash API returns an error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: async () => 'Invalid access key',
    });

    const req = makeRequest('cat');
    const res = await GET(req);
    expect(res.status).toBe(502);
  });

  it('should return 500 on unexpected exception', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const req = makeRequest('cat');
    const res = await GET(req);
    expect(res.status).toBe(500);
  });
});
