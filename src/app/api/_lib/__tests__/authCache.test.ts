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

import {
  _resetAuthCache,
  getProfileForUser,
  getProfileForUserResult,
  getUserFromToken,
  getUserFromTokenResult,
} from '../authCache';

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('authCache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetAuthCache();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
  });

  describe('getUserFromToken', () => {
    it('returns the user for a valid token', async () => {
      const user = { id: 'u1', email: 'a@b.c' };
      mockGetUser.mockResolvedValue({ data: { user }, error: null });
      expect(await getUserFromToken('token-1')).toEqual(user);
      expect(mockGetUser).toHaveBeenCalledTimes(1);
    });

    it('serves repeat verifications of the same token from cache', async () => {
      const user = { id: 'u1' };
      mockGetUser.mockResolvedValue({ data: { user }, error: null });
      await getUserFromToken('token-1');
      await getUserFromToken('token-1');
      await getUserFromToken('token-1');
      expect(mockGetUser).toHaveBeenCalledTimes(1);
    });

    it('deduplicates concurrent verifications of the same token', async () => {
      const user = { id: 'u1' };
      mockGetUser.mockResolvedValue({ data: { user }, error: null });
      const [a, b] = await Promise.all([getUserFromToken('token-1'), getUserFromToken('token-1')]);
      expect(a).toEqual(user);
      expect(b).toEqual(user);
      expect(mockGetUser).toHaveBeenCalledTimes(1);
    });

    it('does not cache failed verifications', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('bad') });
      expect(await getUserFromToken('bad-token')).toBeNull();
      expect(await getUserFromToken('bad-token')).toBeNull();
      expect(mockGetUser).toHaveBeenCalledTimes(2);
    });

    it('caches different tokens independently', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'u1' } }, error: null });
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'u2' } }, error: null });
      expect((await getUserFromToken('token-1'))?.id).toBe('u1');
      expect((await getUserFromToken('token-2'))?.id).toBe('u2');
      expect(mockGetUser).toHaveBeenCalledTimes(2);
    });

    it('returns null when Supabase env config is missing', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.SUPABASE_URL;
      expect(await getUserFromToken('token-1')).toBeNull();
      expect(mockGetUser).not.toHaveBeenCalled();
    });
  });

  describe('getProfileForUser', () => {
    it('returns and caches the profile for a user', async () => {
      const profile = { id: 'u1', username: 'anna', account_type: 'organizer' };
      mockSelectSingle.mockResolvedValue({ data: profile, error: null });
      expect(await getProfileForUser('u1', 'token-1')).toEqual(profile);
      expect(await getProfileForUser('u1', 'token-1')).toEqual(profile);
      expect(mockSelectSingle).toHaveBeenCalledTimes(1);
    });

    it('does not cache failed profile lookups', async () => {
      mockSelectSingle.mockResolvedValue({ data: null, error: { message: 'not found' } });
      expect(await getProfileForUser('u1', 'token-1')).toBeNull();
      expect(await getProfileForUser('u1', 'token-1')).toBeNull();
      expect(mockSelectSingle).toHaveBeenCalledTimes(2);
    });
  });

  describe('AuthLookup', () => {
    it('reports an absent profile row as absent, not as a failure', async () => {
      mockSelectSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
      expect(await getProfileForUserResult('u1', 'token-1')).toEqual({ value: null, error: null });
    });

    it('reports a dead database as a failure, so the caller can answer 503', async () => {
      mockSelectSingle.mockResolvedValue({
        data: null,
        error: { message: 'upstream connect error or disconnect/reset before headers' },
      });
      const result = await getProfileForUserResult('u1', 'token-1');
      expect(result.value).toBeNull();
      expect(result.error?.kind).toBe('upstream');
    });

    it('reports a rejected token as absent and an unreachable auth server as a failure', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: { name: 'AuthApiError', message: 'invalid claim', status: 401 },
      });
      expect(await getUserFromTokenResult('bad')).toEqual({ value: null, error: null });

      mockGetUser.mockRejectedValueOnce(
        Object.assign(new Error('Failed to fetch'), { name: 'AuthRetryableFetchError' }),
      );
      expect((await getUserFromTokenResult('good')).error?.kind).toBe('offline');
    });

    it('keeps the null-returning wrappers null for both outcomes', async () => {
      mockSelectSingle.mockResolvedValue({ data: null, error: { message: 'boom' } });
      expect(await getProfileForUser('u1', 'token-1')).toBeNull();
      mockGetUser.mockResolvedValue({ data: { user: null }, error: { status: 401 } });
      expect(await getUserFromToken('bad')).toBeNull();
    });
  });
});
