import { createClient } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';

import { isAdminEmail } from '@/lib/admin';

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

interface RateLimitConfig {
  windowMs: number;
  max: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 60 seconds to prevent memory leaks
const CLEANUP_INTERVAL_MS = 60_000;
let lastCleanup = Date.now();

function cleanup(now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (now - entry.windowStart > entry.count * 60_000) {
      // Entry is stale — older than any reasonable window
      store.delete(key);
    }
  }
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

/**
 * Try to extract the admin status from a Supabase Bearer token, if present.
 * Returns true only when the token resolves to the admin email.
 * Fails open (returns false) — missing/invalid tokens are not errors here.
 */
async function isAdminRequest(req: NextRequest): Promise<boolean> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return false;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) return false;

  try {
    const { data } = await createClient(url, anonKey).auth.getUser(authHeader.slice(7));
    return isAdminEmail(data.user?.email ?? undefined);
  } catch {
    return false;
  }
}

/**
 * In-memory sliding-window rate limiter.
 * Returns a 429 NextResponse if the limit is exceeded, or null if the request is allowed.
 * Admin users (identified by Supabase auth token) bypass the limiter.
 */
export async function rateLimit(
  req: NextRequest,
  { windowMs, max }: RateLimitConfig,
): Promise<NextResponse | null> {
  if (await isAdminRequest(req)) return null;

  const now = Date.now();
  cleanup(now);

  const ip = getClientIp(req);
  const key = `${ip}:${req.nextUrl.pathname}`;
  const entry = store.get(key);

  if (!entry || now - entry.windowStart >= windowMs) {
    // New window
    store.set(key, { count: 1, windowStart: now });
    return null;
  }

  if (entry.count < max) {
    entry.count += 1;
    return null;
  }

  // Rate limit exceeded
  const retryAfterMs = windowMs - (now - entry.windowStart);
  const retryAfterSecs = Math.ceil(retryAfterMs / 1000);

  return NextResponse.json(
    { error: 'Too many requests. Please try again later.' },
    {
      status: 429,
      headers: { 'Retry-After': String(retryAfterSecs) },
    },
  );
}

/** Visible for testing — resets all rate limit state. */
export function _resetStore() {
  store.clear();
  lastCleanup = Date.now();
}
