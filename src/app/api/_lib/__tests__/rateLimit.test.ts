import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { _resetStore, rateLimit } from '../rateLimit';

// Default: getUser returns null (non-admin). Individual tests can override.
const mockGetUser = vi.fn().mockResolvedValue({ data: { user: null }, error: null });

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ auth: { getUser: (...args: unknown[]) => mockGetUser(...args) } }),
}));

function makeRequest(ip = '1.2.3.4', path = '/api/test'): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`, {
    headers: { 'x-forwarded-for': ip },
  });
}

describe('rateLimit', () => {
  beforeEach(() => {
    _resetStore();
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
  });
  afterEach(() => _resetStore());

  it('allows requests under the limit', async () => {
    const config = { windowMs: 60_000, max: 3 };
    expect(await rateLimit(makeRequest(), config)).toBeNull();
    expect(await rateLimit(makeRequest(), config)).toBeNull();
    expect(await rateLimit(makeRequest(), config)).toBeNull();
  });

  it('blocks requests over the limit with 429', async () => {
    const config = { windowMs: 60_000, max: 2 };
    await rateLimit(makeRequest(), config);
    await rateLimit(makeRequest(), config);

    const result = await rateLimit(makeRequest(), config);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(429);

    const body = await result!.json();
    expect(body.error).toMatch(/too many requests/i);
    expect(result!.headers.get('Retry-After')).toBeTruthy();
  });

  it('tracks different IPs independently', async () => {
    const config = { windowMs: 60_000, max: 1 };
    expect(await rateLimit(makeRequest('10.0.0.1'), config)).toBeNull();
    expect(await rateLimit(makeRequest('10.0.0.2'), config)).toBeNull();

    expect(await rateLimit(makeRequest('10.0.0.1'), config)).not.toBeNull();
    expect(await rateLimit(makeRequest('10.0.0.2'), config)).not.toBeNull();
  });

  it('tracks different paths independently', async () => {
    const config = { windowMs: 60_000, max: 1 };
    expect(await rateLimit(makeRequest('1.2.3.4', '/api/a'), config)).toBeNull();
    expect(await rateLimit(makeRequest('1.2.3.4', '/api/b'), config)).toBeNull();
  });

  it('resets after window expires', async () => {
    const config = { windowMs: 100, max: 1 };
    await rateLimit(makeRequest(), config);
    expect(await rateLimit(makeRequest(), config)).not.toBeNull();

    _resetStore();
    expect(await rateLimit(makeRequest(), config)).toBeNull();
  });

  it('uses x-real-ip as fallback', async () => {
    const config = { windowMs: 60_000, max: 1 };
    const req = new NextRequest('http://localhost:3000/api/test', {
      headers: { 'x-real-ip': '5.6.7.8' },
    });
    expect(await rateLimit(req, config)).toBeNull();
    expect(await rateLimit(req, config)).not.toBeNull();
  });

  it('bypasses rate limit for admin users', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { email: 'test@kannanao.local' } },
      error: null,
    });

    const config = { windowMs: 60_000, max: 1 };

    // Admin request with Bearer token — always allowed, even past the limit
    const adminReq = new NextRequest('http://localhost:3000/api/test', {
      headers: { 'x-forwarded-for': '1.2.3.4', Authorization: 'Bearer admin-token' },
    });
    expect(await rateLimit(adminReq, config)).toBeNull();
    expect(await rateLimit(adminReq, config)).toBeNull();
    expect(await rateLimit(adminReq, config)).toBeNull();
  });

  it('keyBy user gives each account its own window on a shared IP', async () => {
    // A group scanning one QR code arrives from one school network.
    mockGetUser.mockImplementation((token: string) => ({
      data: { user: { id: token, email: 'learner@example.com' } },
      error: null,
    }));
    const config = { windowMs: 60_000, max: 1, keyBy: 'user' as const };
    const req = (token: string) =>
      new NextRequest('http://localhost:3000/api/test', {
        headers: { 'x-forwarded-for': '1.2.3.4', Authorization: `Bearer ${token}` },
      });

    expect(await rateLimit(req('kenji'), config)).toBeNull();
    expect(await rateLimit(req('aya'), config)).toBeNull();
    expect(await rateLimit(req('kenji'), config)).not.toBeNull();
  });

  it('keyBy user falls back to the IP without a valid token', async () => {
    const config = { windowMs: 60_000, max: 1, keyBy: 'user' as const };
    expect(await rateLimit(makeRequest(), config)).toBeNull();
    expect(await rateLimit(makeRequest(), config)).not.toBeNull();
  });

  it('does not bypass for non-admin authenticated users', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { email: 'regular@example.com' } },
      error: null,
    });

    const config = { windowMs: 60_000, max: 1 };
    const req = new NextRequest('http://localhost:3000/api/test', {
      headers: { 'x-forwarded-for': '1.2.3.4', Authorization: 'Bearer user-token' },
    });
    expect(await rateLimit(req, config)).toBeNull();
    expect(await rateLimit(req, config)).not.toBeNull();
  });
});
