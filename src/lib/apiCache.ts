'use client';

/**
 * Tiny SWR-style cache for client-side GET calls to our API routes.
 *
 * The dashboard and group pages mount several hooks that each hit a Vercel
 * function on every navigation (members, leaderboard, feed, assignments…).
 * The underlying data changes on the scale of study sessions, not seconds, so
 * refetching it all on every page visit made navigation feel slow and burned
 * function invocations. This cache gives hooks three behaviors:
 *
 * - fresh hit (< freshMs): resolve from memory, no network at all
 * - stale hit (< MAX_AGE_MS): `peekApiCache` lets the hook paint the old data
 *   instantly while `fetchJsonCached` revalidates over the network
 * - miss: normal fetch
 *
 * Mutations must call `invalidateApiCache(prefix)` so the next read refetches.
 * The cache is per-page-load module state — a full reload starts empty.
 */

const FRESH_MS = 30_000;
const MAX_AGE_MS = 10 * 60_000;

interface Entry {
  data: unknown;
  fetchedAt: number;
}

const cache = new Map<string, Entry>();
const inFlight = new Map<string, Promise<unknown>>();

/** Return the cached value for a key if present and not ancient (may be stale). */
export function peekApiCache<T>(key: string): T | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.fetchedAt > MAX_AGE_MS) {
    cache.delete(key);
    return undefined;
  }
  return entry.data as T;
}

/**
 * GET `url` as JSON, deduplicating concurrent calls and serving fresh cache
 * hits without a network round-trip. Pass `freshMs: 0` to force revalidation.
 * On a failed fetch, falls back to any cached value before throwing.
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
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = (await res.json()) as T;
      cache.set(url, { data, fetchedAt: Date.now() });
      return data;
    } catch (err) {
      const stale = peekApiCache<T>(url);
      if (stale !== undefined) return stale;
      throw err;
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
