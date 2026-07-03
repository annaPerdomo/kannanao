import { createHash } from 'node:crypto';

import { createClient, type User } from '@supabase/supabase-js';

/**
 * Short-lived in-memory cache for Bearer-token verification and the requester's
 * own profile row. Every API route pays a round-trip to the Supabase auth
 * server (`auth.getUser`) plus a profile query before doing any real work, and
 * the dashboard fires several API calls at once with the same token — so those
 * round-trips dominated latency and Vercel Active CPU. Fluid compute reuses
 * function instances across requests, which is what makes a module-level cache
 * effective here.
 *
 * Only successful lookups are cached (a forged or expired token is re-verified
 * on every attempt), and entries expire after 60s, so a revoked session or a
 * changed account type is honored within a minute — well inside the token's own
 * 1-hour lifetime.
 */

const TTL_MS = 60_000;
const MAX_ENTRIES = 500;

interface Entry<T> {
  value: T;
  expiresAt: number;
}

const userByToken = new Map<string, Entry<User>>();
const userInFlight = new Map<string, Promise<User | null>>();

/**
 * Never use a raw access token as a map key — that retains live secrets in
 * process memory. Key the cache by a SHA-256 digest instead; it's a stable,
 * non-reversible fingerprint of the token.
 */
function tokenKey(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export interface CachedProfile {
  id: string;
  username: string;
  account_type: string | null;
  organizer_id: string | null;
  group_id: string | null;
  display_name: string | null;
}

const profileById = new Map<string, Entry<CachedProfile>>();
const profileInFlight = new Map<string, Promise<CachedProfile | null>>();

function supabaseConfig(): { url: string; anonKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

function getFresh<T>(map: Map<string, Entry<T>>, key: string): T | null {
  const entry = map.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    map.delete(key);
    return null;
  }
  return entry.value;
}

function setEntry<T>(map: Map<string, Entry<T>>, key: string, value: T): void {
  // Bound the cache without a stampede: Map preserves insertion order, so the
  // first keys are the oldest. Evict a small batch of them rather than clearing
  // everything, which would force every live session to re-verify at once.
  if (map.size >= MAX_ENTRIES) {
    const evict = Math.ceil(MAX_ENTRIES * 0.1);
    let removed = 0;
    for (const oldestKey of map.keys()) {
      map.delete(oldestKey);
      if (++removed >= evict) break;
    }
  }
  map.set(key, { value, expiresAt: Date.now() + TTL_MS });
}

/** Verify a Supabase access token, deduplicating concurrent and repeat checks. */
export async function getUserFromToken(token: string): Promise<User | null> {
  const key = tokenKey(token);
  const cached = getFresh(userByToken, key);
  if (cached) return cached;
  const pending = userInFlight.get(key);
  if (pending) return pending;

  const config = supabaseConfig();
  if (!config) return null;

  const promise = (async () => {
    try {
      const { data, error } = await createClient(config.url, config.anonKey).auth.getUser(token);
      if (error || !data.user) return null;
      setEntry(userByToken, key, data.user);
      return data.user;
    } catch {
      return null;
    } finally {
      userInFlight.delete(key);
    }
  })();
  userInFlight.set(key, promise);
  return promise;
}

/**
 * Fetch the requester's own profile row via an RLS-scoped client (the token in
 * the Authorization header), cached per user id. Callers must pass a userId
 * that came from `getUserFromToken` for the same token.
 */
export async function getProfileForUser(
  userId: string,
  token: string,
): Promise<CachedProfile | null> {
  const cached = getFresh(profileById, userId);
  if (cached) return cached;
  const pending = profileInFlight.get(userId);
  if (pending) return pending;

  const config = supabaseConfig();
  if (!config) return null;

  const promise = (async () => {
    try {
      const supabase = createClient(config.url, config.anonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, account_type, organizer_id, group_id, display_name')
        .eq('id', userId)
        .single();
      if (error || !data) return null;
      const profile = data as CachedProfile;
      setEntry(profileById, userId, profile);
      return profile;
    } catch {
      return null;
    } finally {
      profileInFlight.delete(userId);
    }
  })();
  profileInFlight.set(userId, promise);
  return promise;
}

/** Test-only: clears all cached verifications and in-flight requests. */
export function _resetAuthCache(): void {
  userByToken.clear();
  userInFlight.clear();
  profileById.clear();
  profileInFlight.clear();
}
