'use client';

import { dataErrorFromResponse, toDataError } from './dataError';

/**
 * Tiny SWR-style cache for client-side GET calls to our API routes.
 *
 * The dashboard and group pages mount several hooks that each hit a Vercel
 * function on every navigation (members, leaderboard, feed, assignments…). The
 * underlying data changes on the scale of study sessions, not seconds, so
 * refetching it all on every page visit made navigation feel slow and burned
 * function invocations. This cache gives hooks three behaviors:
 *
 * - fresh hit (< freshMs): resolve from memory, no network at all
 * - stale hit (< MAX_AGE_MS): `peekApiCache` lets the hook paint the old data
 *   instantly while `fetchJsonCached` revalidates over the network
 * - miss: normal fetch
 *
 * A failed revalidation falls back to the cached value rather than throwing —
 * that is what kept parts of the app usable through the 2026-08-26 outage.
 * `peekApiCacheMeta` is how a caller tells that fallback from a live read.
 *
 * Mutations must call `invalidateApiCache(prefix)` so the next read refetches.
 * The cache is per-page-load module state — a full reload starts empty.
 */

const FRESH_MS = 30_000;
const MAX_AGE_MS = 10 * 60_000;
// A stale hit hides the outage that produced it, so bound how many it may hide:
// past this many consecutive failed revalidations the caller gets the error.
const MAX_STALE_SERVES = 3;

interface Entry {
  data: unknown;
  fetchedAt: number;
  /** Failed revalidations since `fetchedAt`; 0 while the value is live. */
  failures: number;
}

export interface ApiCacheMeta {
  /** Epoch ms of the fetch that produced the value — its age, for "older data" hints. */
  fetchedAt: number;
  /** The value came from the fallback path: the most recent fetch failed. */
  stale: boolean;
}

const cache = new Map<string, Entry>();
const inFlight = new Map<string, Promise<unknown>>();

/** The entry for `key`, evicting it first if it aged past `MAX_AGE_MS`. */
function liveEntry(key: string): Entry | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.fetchedAt > MAX_AGE_MS) {
    cache.delete(key);
    return undefined;
  }
  return entry;
}

/** Return the cached value for a key if present and not ancient (may be stale). */
export function peekApiCache<T>(key: string): T | undefined {
  const entry = liveEntry(key);
  return entry ? (entry.data as T) : undefined;
}

/**
 * Freshness of the cached value for `key`, so a caller can say it is showing
 * older data. Read it after `fetchJsonCached` resolves: a resolved promise with
 * `stale: true` is the fallback path, not a live response.
 */
export function peekApiCacheMeta(key: string): ApiCacheMeta | undefined {
  const entry = liveEntry(key);
  return entry ? { fetchedAt: entry.fetchedAt, stale: entry.failures > 0 } : undefined;
}

/**
 * GET `url` as JSON, deduplicating concurrent calls and serving fresh cache
 * hits without a network round-trip. Pass `freshMs: 0` to force revalidation.
 * On a failed fetch, falls back to any cached value before rejecting with a
 * `DataError`.
 */
export async function fetchJsonCached<T>(
  url: string,
  getHeaders: () => Promise<Record<string, string>> | Record<string, string>,
  { freshMs = FRESH_MS }: { freshMs?: number } = {},
): Promise<T> {
  const entry = cache.get(url);
  if (entry && Date.now() - entry.fetchedAt < freshMs) return entry.data as T;

  const pending = inFlight.get(url);
  if (pending) return pending as Promise<T>;

  const promise = (async () => {
    try {
      const res = await fetch(url, { headers: await getHeaders() });
      if (!res.ok) throw await dataErrorFromResponse(res);
      const data = (await res.json()) as T;
      cache.set(url, { data, fetchedAt: Date.now(), failures: 0 });
      return data;
    } catch (err) {
      const error = toDataError(err);
      const cached = liveEntry(url);
      if (cached) {
        cached.failures += 1;
        if (cached.failures <= MAX_STALE_SERVES) return cached.data as T;
      }
      throw error;
    } finally {
      inFlight.delete(url);
    }
  })();
  inFlight.set(url, promise);
  return promise;
}

/** Drop every cached entry whose key starts with `prefix` (e.g. after a mutation). */
export function invalidateApiCache(prefix: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}

/** Test-only: clears all cache and in-flight state. */
export function _resetApiCache(): void {
  cache.clear();
  inFlight.clear();
}
