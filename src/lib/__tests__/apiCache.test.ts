import { beforeEach, describe, expect, it, vi } from 'vitest';

import { _resetApiCache, fetchJsonCached, invalidateApiCache, peekApiCache } from '@/lib/apiCache';

const mockFetch = vi.fn();
global.fetch = mockFetch;

const HEADERS = () => ({ Authorization: 'Bearer t' });

function okResponse(data: unknown) {
  return { ok: true, json: async () => data };
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

  it('throws on a failed response with no cached fallback', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 });
    await expect(fetchJsonCached('/api/a', HEADERS)).rejects.toThrow('500');
  });

  it('falls back to the cached value when a revalidation fails', async () => {
    mockFetch.mockResolvedValueOnce(okResponse('good'));
    await fetchJsonCached('/api/a', HEADERS);
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    expect(await fetchJsonCached('/api/a', HEADERS, { freshMs: 0 })).toBe('good');
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
