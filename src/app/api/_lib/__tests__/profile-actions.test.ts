import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const { getUserFromTokenResultMock } = vi.hoisted(() => ({
  getUserFromTokenResultMock: vi.fn(),
}));

vi.mock('@/app/api/_lib/authCache', () => ({
  getUserFromTokenResult: (...args: unknown[]) => getUserFromTokenResultMock(...args),
}));

import { DataError } from '@/lib/dataError';

import { authenticateUser, handleProfileAction } from '../profile-actions';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(withAuth = true) {
  return new Request('http://localhost/api/profile', {
    method: 'PATCH',
    headers: withAuth ? { authorization: 'Bearer tok' } : {},
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('authenticateUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
    getUserFromTokenResultMock.mockResolvedValue({ value: { id: 'user-1' }, error: null });
  });

  it('returns 401 without an auth header', async () => {
    const result = await authenticateUser(makeRequest(false));
    expect('error' in result).toBe(true);
    if ('error' in result) expect(result.error.status).toBe(401);
  });

  it('returns 401 for an invalid token', async () => {
    getUserFromTokenResultMock.mockResolvedValue({ value: null, error: null });
    const result = await authenticateUser(makeRequest());
    expect('error' in result).toBe(true);
    if ('error' in result) expect(result.error.status).toBe(401);
  });

  it('returns the user and a service client for a valid token', async () => {
    const result = await authenticateUser(makeRequest());
    expect('user' in result).toBe(true);
    if ('user' in result) expect(result.user.id).toBe('user-1');
  });

  it('returns 503 when the auth service itself is unreachable', async () => {
    getUserFromTokenResultMock.mockResolvedValue({
      value: null,
      error: new DataError('upstream', 'gateway down'),
    });
    const result = await authenticateUser(makeRequest());
    expect('error' in result).toBe(true);
    if ('error' in result) expect(result.error.status).toBe(503);
  });
});

describe('handleProfileAction: changeUsername', () => {
  it('rejects a demo- username as already taken, before touching auth', async () => {
    const updateUserById = vi.fn();
    const serviceClient = {
      from: () => ({
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }),
      }),
      auth: { admin: { updateUserById } },
    };

    const res = await handleProfileAction(serviceClient as never, 'user-1', {
      action: 'changeUsername',
      username: 'demo-x',
    });

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe('Username already taken.');
    expect(updateUserById).not.toHaveBeenCalled();
  });

  it("refuses to change a demo account's own username", async () => {
    const updateUserById = vi.fn();
    const serviceClient = {
      from: () => ({
        select: () => ({
          eq: () => ({ maybeSingle: async () => ({ data: { username: 'demo-maya' } }) }),
        }),
      }),
      auth: { admin: { updateUserById } },
    };

    const res = await handleProfileAction(serviceClient as never, 'demo-user-1', {
      action: 'changeUsername',
      username: 'notdemo',
    });

    expect(res.status).toBe(403);
    expect(updateUserById).not.toHaveBeenCalled();
  });
});

describe('handleProfileAction: changePassword', () => {
  it("refuses to change a demo account's own password", async () => {
    const updateUserById = vi.fn();
    const serviceClient = {
      from: () => ({
        select: () => ({
          eq: () => ({ maybeSingle: async () => ({ data: { username: 'demo-maya' } }) }),
        }),
      }),
      auth: { admin: { updateUserById } },
    };

    const res = await handleProfileAction(serviceClient as never, 'demo-user-1', {
      action: 'changePassword',
      password: 'newpassword123',
    });

    expect(res.status).toBe(403);
    expect(updateUserById).not.toHaveBeenCalled();
  });
});
