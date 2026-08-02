import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { _resetStore } from '@/app/api/_lib/rateLimit';
import { MAX_BATCH_QUERIES } from '@/app/api/_lib/unsplash';
import { IMAGE_BATCH_SIZE } from '@/services/api';

vi.mock('@/app/api/_lib/requireOrganizerAccount', () => ({
  requireOrganizerAccount: vi.fn().mockResolvedValue({
    id: 'org1',
    username: 'organizer',
    account_type: 'organizer',
  }),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  vi.clearAllMocks();
  _resetStore();
  process.env.UNSPLASH_ACCESS_KEY = 'test-unsplash-key';
});

import { POST } from '@/app/api/images/batch/route';

function makeRequest(items: unknown) {
  return new NextRequest('http://localhost/api/images/batch', {
    method: 'POST',
    body: JSON.stringify({ items }),
    headers: { 'Content-Type': 'application/json' },
  });
}

function apiPhoto(slug: string) {
  return {
    urls: { regular: `https://images.unsplash.com/photo-${slug}` },
    links: {
      download_location: `https://api.unsplash.com/photos/${slug}/download`,
      html: `https://unsplash.com/photos/${slug}`,
    },
    user: { name: 'Jane Photographer', links: { html: 'https://unsplash.com/@jane' } },
  };
}

function photoResponse(slug: string, remaining = '40', extraSlugs: string[] = []) {
  return {
    ok: true,
    status: 200,
    headers: new Headers({ 'x-ratelimit-remaining': remaining }),
    json: async () => ({ results: [apiPhoto(slug), ...extraSlugs.map(apiPhoto)] }),
  };
}

const emptyResponse = {
  ok: true,
  status: 200,
  headers: new Headers(),
  json: async () => ({ results: [] }),
};

/** Unsplash reports an exhausted hourly allowance as a 403. */
function rateLimitedResponse() {
  return {
    ok: false,
    status: 403,
    statusText: 'Forbidden',
    text: async () => 'Rate Limit Exceeded',
  };
}

const downloadResponse = { ok: true, status: 200, text: async () => '' };

/**
 * Answers by URL, not by call order: searches run several at a time, so which
 * request lands first is not fixed.
 */
function serve(searches: Record<string, unknown>) {
  mockFetch.mockImplementation(async (url: string) => {
    if (url.includes('/download')) return downloadResponse;
    const query = decodeURIComponent(new URL(url).searchParams.get('query') ?? '');
    return searches[query] ?? emptyResponse;
  });
}

/** Search calls only, in the order they were made. */
function searchCalls() {
  return mockFetch.mock.calls.map(([url]) => url as string).filter((u) => !u.includes('/download'));
}

describe('POST /api/images/batch', () => {
  it('searches every query and triggers each download', async () => {
    serve({ cat: photoResponse('cat'), dog: photoResponse('dog') });

    const res = await POST(makeRequest(['cat', 'dog']));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.rateLimited).toBe(false);
    expect(body.results).toHaveLength(2);
    expect(body.results[0]).toMatchObject({
      query: 'cat',
      result: {
        url: 'https://images.unsplash.com/photo-cat',
        photographerName: 'Jane Photographer',
      },
    });
    expect(mockFetch).toHaveBeenCalledTimes(4);
  });

  it('keeps what it found when the hourly allowance runs out partway', async () => {
    serve({ cat: photoResponse('cat'), dog: rateLimitedResponse() });

    const res = await POST(makeRequest(['cat', 'dog', 'bird']));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.rateLimited).toBe(true);
    expect(body.stopped).toBe(false);
    expect(body.results.map((r: { query: string }) => r.query)).toEqual(['cat']);
  });

  it('marks a run that died on an Unsplash fault as stopped, not as empty', async () => {
    serve({
      cat: photoResponse('cat'),
      dog: { ok: false, status: 500, statusText: 'Server Error', text: async () => 'boom' },
    });

    const body = await (await POST(makeRequest(['cat', 'dog', 'bird']))).json();

    // Without this the caller reads two silent holes as "no picture for those
    // words" and reports the run as a success.
    expect(body.stopped).toBe(true);
    expect(body.rateLimited).toBe(false);
    expect(body.results.map((r: { query: string }) => r.query)).toEqual(['cat']);
  });

  it('marks a run that died on a network fault as stopped', async () => {
    mockFetch.mockRejectedValue(new Error('ECONNRESET'));

    const body = await (await POST(makeRequest(['cat']))).json();

    expect(body.stopped).toBe(true);
    expect(body.results).toEqual([]);
  });

  it('runs a full batch in waves rather than one query at a time', async () => {
    serve({});

    await POST(makeRequest(Array.from({ length: MAX_BATCH_QUERIES }, (_, i) => `word ${i}`)));

    // 25 sequential searches plus their pings outlive the function timeout and
    // lose every result, so the searches have to overlap.
    expect(searchCalls()).toHaveLength(MAX_BATCH_QUERIES);
  });

  it('reports the remaining hourly allowance', async () => {
    serve({ cat: photoResponse('cat', '7') });

    const body = await (await POST(makeRequest(['cat']))).json();

    expect(body.remaining).toBe(7);
  });

  it('returns a null result for a word Unsplash has no photo for', async () => {
    serve({});

    const body = await (await POST(makeRequest(['zzzz']))).json();

    expect(body.results).toEqual([{ query: 'zzzz', result: null }]);
    // No photo means no download ping.
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('spends one search per repeated query', async () => {
    serve({ cat: photoResponse('cat') });

    const body = await (await POST(makeRequest(['cat', 'cat', ' cat ']))).json();

    expect(body.results).toHaveLength(1);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('looks past the top hit for a card that is replacing its picture', async () => {
    serve({ cat: photoResponse('cat', '40', ['cat-2', 'cat-3']) });

    const body = await (await POST(makeRequest([{ query: 'cat', variety: true }]))).json();

    expect(searchCalls()[0]).toContain('per_page=10');
    expect(body.results[0].result.url).toMatch(/photo-cat/);
  });

  it('asks for the top hit only when nothing is being replaced', async () => {
    serve({ cat: photoResponse('cat') });

    await POST(makeRequest([{ query: 'cat' }]));

    expect(searchCalls()[0]).toContain('per_page=1');
  });

  it('widens a shared query when any card using it is replacing a picture', async () => {
    serve({ cat: photoResponse('cat') });

    const body = await (
      await POST(makeRequest([{ query: 'cat' }, { query: 'cat', variety: true }]))
    ).json();

    expect(body.results).toHaveLength(1);
    expect(searchCalls()[0]).toContain('per_page=10');
  });

  it('rejects an empty item list', async () => {
    const res = await POST(makeRequest([]));
    expect(res.status).toBe(400);
  });

  it('rejects more queries than one hour of allowance can pay for', async () => {
    const res = await POST(makeRequest(Array.from({ length: 40 }, (_, i) => `word ${i}`)));
    expect(res.status).toBe(400);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('never lets the client chunk exceed what the route accepts', () => {
    expect(IMAGE_BATCH_SIZE).toBeLessThanOrEqual(MAX_BATCH_QUERIES);
  });
});
