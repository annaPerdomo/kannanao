import { act, renderHook, waitFor } from '@testing-library/react';
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

import { useEncouragements } from '@/hooks/useEncouragements';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const MSG_UNREAD = {
  id: 'e1',
  organizer_id: 'org1',
  member_id: 'm1',
  message: 'Great job!',
  emoji: '🌟',
  read_at: null,
  created_at: '2026-04-26T10:00:00Z',
  profiles: { display_name: 'Sensei', username: 'sensei' },
};

const MSG_READ = {
  id: 'e2',
  organizer_id: 'org1',
  member_id: 'm1',
  message: 'Keep it up!',
  emoji: '💪',
  read_at: '2026-04-26T11:00:00Z',
  created_at: '2026-04-25T08:00:00Z',
  profiles: { display_name: 'Sensei', username: 'sensei' },
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('useEncouragements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: 'm1' } });
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'tok123' } },
    });
  });

  // ── initial load ──────────────────────────────────────────────────────────

  it('loads encouragements on mount', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [MSG_UNREAD, MSG_READ],
    });
    const { result } = renderHook(() => useEncouragements());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.encouragements).toHaveLength(2);
  });

  it('computes unreadCount correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [MSG_UNREAD, MSG_READ],
    });
    const { result } = renderHook(() => useEncouragements());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.unreadCount).toBe(1);
  });

  it('sets empty when no user', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    const { result } = renderHook(() => useEncouragements());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.encouragements).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('handles fetch failure silently', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network'));
    const { result } = renderHook(() => useEncouragements());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.encouragements).toEqual([]);
  });

  // ── sendEncouragement ─────────────────────────────────────────────────────

  it('sends encouragement via POST', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
    const { result } = renderHook(() => useEncouragements());
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'e-new' }),
    });

    await act(async () => {
      await result.current.sendEncouragement('m1', 'You can do it!', '🎉');
    });

    const postCall = mockFetch.mock.calls[1];
    expect(postCall[1].method).toBe('POST');
    const body = JSON.parse(postCall[1].body);
    expect(body.memberId).toBe('m1');
    expect(body.message).toBe('You can do it!');
    expect(body.emoji).toBe('🎉');
  });

  it('throws when send fails', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
    const { result } = renderHook(() => useEncouragements());
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Member not found' }),
    });

    await expect(
      act(async () => {
        await result.current.sendEncouragement('bad', 'msg');
      }),
    ).rejects.toThrow('Member not found');
  });

  // ── markAsRead (optimistic) ───────────────────────────────────────────────

  it('optimistically marks message as read', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [MSG_UNREAD, MSG_READ],
    });
    const { result } = renderHook(() => useEncouragements());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.unreadCount).toBe(1);

    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    await act(async () => {
      await result.current.markAsRead('e1');
    });

    expect(result.current.unreadCount).toBe(0);
    expect(result.current.encouragements[0].read_at).toBeTruthy();

    // Verify PATCH was called
    const patchCall = mockFetch.mock.calls[1];
    expect(patchCall[0]).toBe('/api/group/encouragements/e1/read');
    expect(patchCall[1].method).toBe('PATCH');
  });

  // ── markAllAsRead ─────────────────────────────────────────────────────────

  it('marks all unread messages as read', async () => {
    const anotherUnread = { ...MSG_UNREAD, id: 'e3', message: 'Wow!' };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [MSG_UNREAD, anotherUnread, MSG_READ],
    });
    const { result } = renderHook(() => useEncouragements());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.unreadCount).toBe(2);

    // Two PATCH calls for the two unread messages
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });

    await act(async () => {
      await result.current.markAllAsRead();
    });

    expect(result.current.unreadCount).toBe(0);
  });
});
