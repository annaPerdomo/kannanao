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

import { useGroupLeaderboard } from '@/hooks/useGroupLeaderboard';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const ENTRIES = [
  {
    id: 'u1',
    username: 'yuki',
    displayName: 'Yuki',
    weeklyXp: 450,
    weeklyCards: 80,
    streakDays: 5,
    level: 7,
  },
  {
    id: 'u2',
    username: 'hana',
    displayName: 'Hana',
    weeklyXp: 300,
    weeklyCards: 50,
    streakDays: 2,
    level: 4,
  },
  {
    id: 'org1',
    username: 'sensei',
    displayName: 'Sensei',
    weeklyXp: 200,
    weeklyCards: 30,
    streakDays: 1,
    level: 10,
  },
];

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('useGroupLeaderboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: 'org1' } });
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'tok123' } },
    });
  });

  it('loads leaderboard on mount', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ENTRIES,
    });
    const { result } = renderHook(() => useGroupLeaderboard());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.leaderboard).toHaveLength(3);
    expect(result.current.leaderboard[0].weeklyXp).toBe(450);
  });

  it('returns empty when leaderboard is disabled', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });
    const { result } = renderHook(() => useGroupLeaderboard());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.leaderboard).toEqual([]);
  });

  it('returns empty when no user', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    const { result } = renderHook(() => useGroupLeaderboard());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.leaderboard).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('handles fetch failure silently', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network'));
    const { result } = renderHook(() => useGroupLeaderboard());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.leaderboard).toEqual([]);
  });

  it('includes Authorization header', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
    renderHook(() => useGroupLeaderboard());
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers.Authorization).toBe('Bearer tok123');
  });

  it('fetches the correct endpoint', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
    renderHook(() => useGroupLeaderboard());
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    expect(mockFetch.mock.calls[0][0]).toBe('/api/group/leaderboard');
  });
});
