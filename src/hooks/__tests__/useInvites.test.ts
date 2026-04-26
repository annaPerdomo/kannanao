import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockUseAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

import { useInvites } from '@/hooks/useInvites';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const INVITE_1 = {
  id: 'inv1',
  code: 'ABC12345',
  organizer_id: 'org1',
  label: "Yuki's class",
  max_uses: 5,
  times_used: 2,
  expires_at: '2026-05-01T00:00:00Z',
  created_at: '2026-04-25T00:00:00Z',
};

const INVITE_2 = {
  id: 'inv2',
  code: 'XYZ67890',
  organizer_id: 'org1',
  label: null,
  max_uses: null,
  times_used: 0,
  expires_at: null,
  created_at: '2026-04-26T00:00:00Z',
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('useInvites', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      session: { access_token: 'tok123' },
    });
  });

  // ── initial load ──────────────────────────────────────────────────────────

  it('starts in loading state', () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
    const { result } = renderHook(() => useInvites());
    expect(result.current.loading).toBe(true);
  });

  it('loads invites on mount when session exists', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [INVITE_1, INVITE_2],
    });
    const { result } = renderHook(() => useInvites());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.invites).toHaveLength(2);
    expect(result.current.invites[0].code).toBe('ABC12345');
  });

  it('does not fetch when no session token', async () => {
    mockUseAuth.mockReturnValue({ session: null });
    const { result } = renderHook(() => useInvites());
    // Should stay in loading state but not call fetch
    // Give it a tick to settle
    await new Promise((r) => setTimeout(r, 50));
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('sets error when fetch fails', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    const { result } = renderHook(() => useInvites());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeTruthy();
    expect(result.current.invites).toEqual([]);
  });

  // ── createInvite ──────────────────────────────────────────────────────────

  it('creates invite and prepends to list', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [INVITE_1] });
    const { result } = renderHook(() => useInvites());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.invites).toHaveLength(1);

    const newInvite = { ...INVITE_2, id: 'inv-new' };
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => newInvite });

    let created: unknown;
    await act(async () => {
      created = await result.current.createInvite({
        label: 'New class',
        maxUses: 10,
        expiresIn: '7d',
      });
    });

    expect(created).toMatchObject({ id: 'inv-new' });
    expect(result.current.invites).toHaveLength(2);
    expect(result.current.invites[0].id).toBe('inv-new'); // prepended

    // Verify POST request
    const postCall = mockFetch.mock.calls[1];
    expect(postCall[1].method).toBe('POST');
    const body = JSON.parse(postCall[1].body);
    expect(body.label).toBe('New class');
    expect(body.maxUses).toBe(10);
    expect(body.expiresIn).toBe('7d');
  });

  it('throws when create fails', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
    const { result } = renderHook(() => useInvites());
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Rate limited' }),
    });

    await expect(
      act(async () => {
        await result.current.createInvite({ maxUses: 1, expiresIn: 'never' });
      }),
    ).rejects.toThrow('Rate limited');
  });

  // ── revokeInvite (optimistic) ─────────────────────────────────────────────

  it('optimistically removes invite and calls DELETE', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [INVITE_1, INVITE_2],
    });
    const { result } = renderHook(() => useInvites());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.invites).toHaveLength(2);

    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    await act(async () => {
      await result.current.revokeInvite('inv1');
    });

    expect(result.current.invites).toHaveLength(1);
    expect(result.current.invites[0].id).toBe('inv2');

    const deleteCall = mockFetch.mock.calls[1];
    expect(deleteCall[0]).toBe('/api/group/invite/inv1');
    expect(deleteCall[1].method).toBe('DELETE');
  });

  it('rolls back on revoke failure by refetching', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [INVITE_1],
    });
    const { result } = renderHook(() => useInvites());
    await waitFor(() => expect(result.current.loading).toBe(false));

    // DELETE fails
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    // Refetch call after rollback
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [INVITE_1],
    });

    await act(async () => {
      await result.current.revokeInvite('inv1');
    });

    // After rollback refetch, invite should be back
    await waitFor(() => expect(result.current.invites).toHaveLength(1));
    expect(result.current.invites[0].id).toBe('inv1');
  });

  // ── auth header ───────────────────────────────────────────────────────────

  it('includes Authorization header from session', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
    const { result } = renderHook(() => useInvites());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const fetchCall = mockFetch.mock.calls[0];
    expect(fetchCall[1].headers.Authorization).toBe('Bearer tok123');
  });
});
