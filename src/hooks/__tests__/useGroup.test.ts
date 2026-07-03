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

import { useGroupFeed, useGroupMembers, useMemberDetail } from '@/hooks/useGroup';
import { _resetApiCache } from '@/lib/apiCache';

beforeEach(() => _resetApiCache());

// ─── Fixtures ────────────────────────────────────────────────────────────────

const MEMBER_1 = {
  id: 'm1',
  username: 'yuki',
  displayName: 'Yuki',
  createdAt: '2026-04-20T00:00:00Z',
  level: 5,
  totalXp: 1200,
  streakDays: 3,
  totalCardsStudied: 250,
  totalCorrect: 220,
  totalSessions: 30,
  lastActive: '2026-04-26T10:00:00Z',
};

const MEMBER_2 = {
  id: 'm2',
  username: 'hana',
  displayName: 'Hana',
  createdAt: '2026-04-22T00:00:00Z',
  level: 3,
  totalXp: 600,
  streakDays: 0,
  totalCardsStudied: 80,
  totalCorrect: 65,
  totalSessions: 10,
  lastActive: '2026-04-24T15:00:00Z',
};

const MEMBER_DETAIL = {
  member: { id: 'm1', username: 'yuki', displayName: 'Yuki' },
  progress: {
    totalXp: 1200,
    level: 5,
    streakDays: 3,
    totalCardsStudied: 250,
    totalCorrect: 220,
    totalSessions: 30,
  },
  sessions: [
    {
      id: 's1',
      deckId: 'd1',
      practiceMode: 'recall',
      cardsStudied: 10,
      cardsCorrect: 9,
      xpEarned: 50,
      durationSecs: 120,
      startedAt: '2026-04-26T10:00:00Z',
      endedAt: '2026-04-26T10:02:00Z',
    },
  ],
  achievements: [{ key: 'first_session', unlockedAt: '2026-04-20T00:00:00Z' }],
  deckProgress: [
    {
      deckId: 'd1',
      deckName: 'N5 Kanji',
      deckEmoji: '漢',
      cardsStudied: 100,
      cardsCorrect: 90,
      accuracy: 90,
      lastStudied: '2026-04-26T10:00:00Z',
    },
  ],
};

const FEED_ITEMS = [
  {
    type: 'achievement',
    memberId: 'm1',
    memberName: 'Yuki',
    description: 'Unlocked "First Session"',
    emoji: '🎉',
    timestamp: '2026-04-26T10:00:00Z',
  },
  {
    type: 'perfect_score',
    memberId: 'm2',
    memberName: 'Hana',
    description: 'Perfect score on N5 Kanji',
    emoji: '💯',
    timestamp: '2026-04-25T14:00:00Z',
  },
];

// ─── useGroupMembers ─────────────────────────────────────────────────────────

describe('useGroupMembers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: 'org1' }, isMemberAccount: false });
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'tok123' } },
    });
  });

  it('loads members on mount', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [MEMBER_1, MEMBER_2],
    });
    const { result } = renderHook(() => useGroupMembers());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.members).toHaveLength(2);
    expect(result.current.members[0].username).toBe('yuki');
  });

  it('returns empty for member accounts', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'm1' }, isMemberAccount: true });
    const { result } = renderHook(() => useGroupMembers());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.members).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns empty when no user', async () => {
    mockUseAuth.mockReturnValue({ user: null, isMemberAccount: false });
    const { result } = renderHook(() => useGroupMembers());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.members).toEqual([]);
  });

  it('sets error when fetch fails', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    const { result } = renderHook(() => useGroupMembers());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeTruthy();
  });

  it('includes Authorization header', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
    renderHook(() => useGroupMembers());
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers.Authorization).toBe('Bearer tok123');
  });
});

// ─── useMemberDetail ─────────────────────────────────────────────────────────

describe('useMemberDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: 'org1' }, isMemberAccount: false });
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'tok123' } },
    });
  });

  it('loads member detail when memberId is provided', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => MEMBER_DETAIL,
    });
    const { result } = renderHook(() => useMemberDetail('m1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.detail).not.toBeNull();
    expect(result.current.detail!.member.username).toBe('yuki');
    expect(result.current.detail!.sessions).toHaveLength(1);
    expect(result.current.detail!.deckProgress).toHaveLength(1);
  });

  it('returns null detail when memberId is null', async () => {
    const { result } = renderHook(() => useMemberDetail(null));
    // Should not fetch at all
    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.detail).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('sets error when fetch fails', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });
    const { result } = renderHook(() => useMemberDetail('bad-id'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeTruthy();
    expect(result.current.detail).toBeNull();
  });

  it('fetches correct URL for member ID', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => MEMBER_DETAIL,
    });
    renderHook(() => useMemberDetail('m1'));
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    expect(mockFetch.mock.calls[0][0]).toBe('/api/group/members/m1');
  });
});

// ─── useGroupFeed ────────────────────────────────────────────────────────────

describe('useGroupFeed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: 'org1' }, isMemberAccount: false });
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'tok123' } },
    });
  });

  it('loads feed items on mount', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => FEED_ITEMS,
    });
    const { result } = renderHook(() => useGroupFeed());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.feed).toHaveLength(2);
    expect(result.current.feed[0].type).toBe('achievement');
  });

  it('returns empty feed when no user', async () => {
    mockUseAuth.mockReturnValue({ user: null, isMemberAccount: false });
    const { result } = renderHook(() => useGroupFeed());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.feed).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('handles fetch failure silently', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network'));
    const { result } = renderHook(() => useGroupFeed());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.feed).toEqual([]);
  });
});
