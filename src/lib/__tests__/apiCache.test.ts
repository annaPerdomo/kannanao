import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  _resetApiCache,
  fetchJsonCached,
  invalidateApiCache,
  peekApiCache,
  peekApiCacheMeta,
} from '@/lib/apiCache';
import { isDataError } from '@/lib/dataError';

const mockFetch = vi.fn();
global.fetch = mockFetch;

const HEADERS = () => ({ Authorization: 'Bearer t' });

function okResponse(data: unknown) {
  return { ok: true, json: async () => data };
}

// The 2026-08-26 gateway body, verbatim: text/plain, no JSON envelope.
const ENVOY_BODY =
  'upstream connect error or disconnect/reset before headers. retried and the latest reset reason: remote connection failure, transport failure reason: delayed connect error: 111';

const outage = () => new Response(ENVOY_BODY, { status: 503 });

async function caught(promise: Promise<unknown>) {
  try {
    await promise;
    throw new Error('expected a rejection');
  } catch (err) {
    return err;
  }
}

describe('apiCache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetApiCache();
  });

  it('fetches and caches a JSON response', async () => {
    mockFetch.mockResolvedValue(okResponse([1, 2]));
    expect(await fetchJsonCached('/api/a', HEADERS)).toEqual([1, 2]);
    expect(await fetchJsonCached('/api/a', HEADERS)).toEqual([1, 2]);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('deduplicates concurrent fetches of the same URL', async () => {
    mockFetch.mockResolvedValue(okResponse('x'));
    const [a, b] = await Promise.all([
      fetchJsonCached('/api/a', HEADERS),
      fetchJsonCached('/api/a', HEADERS),
    ]);
    expect(a).toBe('x');
    expect(b).toBe('x');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('caches different URLs independently', async () => {
    mockFetch.mockResolvedValueOnce(okResponse('a')).mockResolvedValueOnce(okResponse('b'));
    expect(await fetchJsonCached('/api/a', HEADERS)).toBe('a');
    expect(await fetchJsonCached('/api/b', HEADERS)).toBe('b');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('refetches when freshMs is 0', async () => {
    mockFetch.mockResolvedValueOnce(okResponse('old')).mockResolvedValueOnce(okResponse('new'));
    expect(await fetchJsonCached('/api/a', HEADERS)).toBe('old');
    expect(await fetchJsonCached('/api/a', HEADERS, { freshMs: 0 })).toBe('new');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('throws a DataError on a failed response with no cached fallback', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 });
    const err = await caught(fetchJsonCached('/api/a', HEADERS));
    expect(isDataError(err)).toBe(true);
    expect(peekApiCacheMeta('/api/a')).toBeUndefined();
  });

  it("reports the outage's 503 as upstream", async () => {
    mockFetch.mockResolvedValue(outage());
    const err = await caught(fetchJsonCached('/api/a', HEADERS));
    expect(isDataError(err) && err.kind).toBe('upstream');
    expect(isDataError(err) && err.status).toBe(503);
  });

  it('reports a rejected fetch as offline', async () => {
    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));
    const err = await caught(fetchJsonCached('/api/a', HEADERS));
    expect(isDataError(err) && err.kind).toBe('offline');
  });

  it('falls back to the cached value when a revalidation fails, and says it is stale', async () => {
    mockFetch.mockResolvedValueOnce(okResponse('good'));
    await fetchJsonCached('/api/a', HEADERS);
    mockFetch.mockResolvedValueOnce(outage());
    expect(await fetchJsonCached('/api/a', HEADERS, { freshMs: 0 })).toBe('good');
    expect(peekApiCacheMeta('/api/a')?.stale).toBe(true);
  });

  it('does not mark a live value stale', async () => {
    mockFetch.mockResolvedValue(okResponse('good'));
    await fetchJsonCached('/api/a', HEADERS);
    const meta = peekApiCacheMeta('/api/a');
    expect(meta?.stale).toBe(false);
    expect(meta?.fetchedAt).toBeGreaterThan(0);
  });

  it('clears the stale flag once a fetch succeeds again', async () => {
    mockFetch.mockResolvedValueOnce(okResponse('good'));
    await fetchJsonCached('/api/a', HEADERS);
    mockFetch.mockResolvedValueOnce(outage());
    await fetchJsonCached('/api/a', HEADERS, { freshMs: 0 });
    mockFetch.mockResolvedValueOnce(okResponse('fresh'));
    expect(await fetchJsonCached('/api/a', HEADERS, { freshMs: 0 })).toBe('fresh');
    expect(peekApiCacheMeta('/api/a')?.stale).toBe(false);
  });

  it('serves the stale value up to the limit, then surfaces the outage', async () => {
    mockFetch.mockResolvedValueOnce(okResponse('good'));
    await fetchJsonCached('/api/a', HEADERS);

    mockFetch.mockResolvedValue(outage());
    for (let attempt = 0; attempt < 3; attempt++) {
      expect(await fetchJsonCached('/api/a', HEADERS, { freshMs: 0 })).toBe('good');
    }

    const err = await caught(fetchJsonCached('/api/a', HEADERS, { freshMs: 0 }));
    expect(isDataError(err) && err.kind).toBe('upstream');
    // The old value stays put: an outage must not repaint the page as empty.
    expect(peekApiCache('/api/a')).toBe('good');
    expect(peekApiCacheMeta('/api/a')?.stale).toBe(true);
  });

  it('peekApiCacheMeta returns undefined for a key that was never fetched', () => {
    expect(peekApiCacheMeta('/api/never')).toBeUndefined();
  });

  it('peekApiCache returns cached data and undefined for misses', async () => {
    mockFetch.mockResolvedValue(okResponse({ n: 1 }));
    expect(peekApiCache('/api/a')).toBeUndefined();
    await fetchJsonCached('/api/a', HEADERS);
    expect(peekApiCache('/api/a')).toEqual({ n: 1 });
  });

  it('invalidateApiCache drops entries by prefix', async () => {
    mockFetch.mockResolvedValue(okResponse('x'));
    await fetchJsonCached('/api/group/invite', HEADERS);
    await fetchJsonCached('/api/group/invite?groupId=g1', HEADERS);
    await fetchJsonCached('/api/other', HEADERS);
    invalidateApiCache('/api/group/invite');
    expect(peekApiCache('/api/group/invite')).toBeUndefined();
    expect(peekApiCache('/api/group/invite?groupId=g1')).toBeUndefined();
    expect(peekApiCache('/api/other')).toBe('x');
  });
});
