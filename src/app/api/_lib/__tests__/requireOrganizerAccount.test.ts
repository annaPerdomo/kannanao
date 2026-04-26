import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockGetUser = vi.fn();
const mockSelectSingle = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: { getUser: (...args: unknown[]) => mockGetUser(...args) },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => mockSelectSingle(),
        }),
      }),
    }),
  }),
}));

import { requireOrganizerAccount } from '../requireOrganizerAccount';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(token?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (token) headers.authorization = `Bearer ${token}`;
  return new NextRequest('http://localhost/api/test', { headers });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('requireOrganizerAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
  });

  it('returns 401 when no Authorization header is present', async () => {
    const result = await requireOrganizerAccount(makeRequest());
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(401);
  });

  it('returns 401 when Authorization header is not Bearer', async () => {
    const req = new NextRequest('http://localhost/api/test', {
      headers: { authorization: 'Basic abc' },
    });
    const result = await requireOrganizerAccount(req);
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(401);
  });

  it('returns 401 when auth.getUser fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('bad token') });
    const result = await requireOrganizerAccount(makeRequest('bad-token'));
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(401);
  });

  it('returns 401 when profile is not found', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    mockSelectSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } });
    const result = await requireOrganizerAccount(makeRequest('valid-token'));
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(401);
  });

  it('returns 403 for member accounts', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    mockSelectSingle.mockResolvedValue({
      data: { id: 'u1', username: 'member1', account_type: 'member' },
      error: null,
    });
    const result = await requireOrganizerAccount(makeRequest('valid-token'));
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(403);
    const body = await (result as NextResponse).json();
    expect(body.error).toContain('not available for member');
  });

  it('returns the profile for organizer accounts', async () => {
    const profile = { id: 'u1', username: 'organizer1', account_type: 'organizer' };
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    mockSelectSingle.mockResolvedValue({ data: profile, error: null });
    const result = await requireOrganizerAccount(makeRequest('valid-token'));
    expect(result).not.toBeInstanceOf(NextResponse);
    expect(result).toEqual(profile);
  });

  it('returns the profile when account_type is null (default organizer)', async () => {
    const profile = { id: 'u1', username: 'user1', account_type: null };
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    mockSelectSingle.mockResolvedValue({ data: profile, error: null });
    const result = await requireOrganizerAccount(makeRequest('valid-token'));
    expect(result).not.toBeInstanceOf(NextResponse);
    expect(result).toEqual(profile);
  });
});
