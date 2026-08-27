import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockGetSession = vi.fn();

vi.mock('@/lib/supabase', () => ({
  sb: {
    auth: { getSession: () => mockGetSession() },
  },
  isConfigured: vi.fn(() => true),
}));

const mockUseAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

import { useGroupLeaderboards } from '@/hooks/useGroupLeaderboards';
import { _resetApiCache } from '@/lib/apiCache';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const BOARDS = [
  {
    groupId: 'advanced',
    groupName: 'Advanced Conversation',
    groupEmoji: '🗣️',
    entries: [{ id: 'u1', username: 'yuki', weeklyXp: 450 }],
  },
  {
    groupId: 'business',
    groupName: 'Business Japanese',
    groupEmoji: '💼',
    entries: [{ id: 'u1', username: 'yuki', weeklyXp: 120 }],
  },
];

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('useGroupLeaderboards', () => {
  beforeEach(() => {
    _resetApiCache();
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'tok123' } } });
  });

  it('loads one board per group', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => BOARDS });

    const { result } = renderHook(() => useGroupLeaderboards());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.boards.map((b) => b.groupId)).toEqual(['advanced', 'business']);
    expect(result.current.error).toBeNull();
    expect(mockFetch.mock.calls[0][0]).toBe('/api/group/leaderboards');
  });

  it('fetches nothing when disabled', async () => {
    const { result } = renderHook(() => useGroupLeaderboards(false));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.boards).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('fetches nothing when signed out', async () => {
    mockUseAuth.mockReturnValue({ user: null });

    const { result } = renderHook(() => useGroupLeaderboards());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('reports a failure without losing the boards it already had', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network'));

    const { result } = renderHook(() => useGroupLeaderboards());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.boards).toEqual([]);
    expect(result.current.error?.message).toBe('network');
  });

  it('seeds from the cache so a second mount paints immediately', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => BOARDS });
    const first = renderHook(() => useGroupLeaderboards());
    await waitFor(() => expect(first.result.current.loading).toBe(false));

    const { result } = renderHook(() => useGroupLeaderboards());

    expect(result.current.boards).toHaveLength(2);
    expect(result.current.loading).toBe(false);
  });
});
