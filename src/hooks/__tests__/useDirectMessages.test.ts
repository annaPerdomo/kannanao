import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockGetSession = vi.fn();
const mockUnreadCount = vi.fn(() => 0);

const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
};

vi.mock('@/lib/supabase', () => ({
  sb: {
    auth: { getSession: () => mockGetSession() },
    channel: vi.fn(() => mockChannel),
    removeChannel: vi.fn(),
    // Used by the cheap count-only unread query (refreshUnreadCount).
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn(() => Promise.resolve({ count: mockUnreadCount(), error: null })),
    })),
  },
  isConfigured: vi.fn(() => true),
}));

const mockUseAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

import { useDirectMessages } from '@/hooks/useDirectMessages';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const DM_UNREAD = {
  id: 'd1',
  sender_id: 'org1',
  recipient_id: 'm1',
  message: 'How was practice?',
  read_at: null,
  created_at: '2026-05-11T10:00:00Z',
  sender: { display_name: 'Parent', username: 'parent' },
  recipient: { display_name: 'Kid', username: 'kid' },
};

const DM_READ = {
  id: 'd2',
  sender_id: 'm1',
  recipient_id: 'org1',
  message: 'I finished studying!',
  read_at: '2026-05-11T09:30:00Z',
  created_at: '2026-05-11T09:00:00Z',
  sender: { display_name: 'Kid', username: 'kid' },
  recipient: { display_name: 'Parent', username: 'parent' },
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('useDirectMessages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: 'm1' } });
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'tok123' } },
    });
  });

  // ── initial load ──────────────────────────────────────────────────────────

  it('does not fetch the full list on mount — only the unread count', async () => {
    mockUnreadCount.mockReturnValue(3);
    const { result } = renderHook(() => useDirectMessages());
    // Unread count comes from the cheap count-only query, not /api/messages.
    await waitFor(() => expect(result.current.unreadCount).toBe(3));
    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.messages).toEqual([]);
  });

  it('loads the full list via ensureLoaded', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [DM_UNREAD, DM_READ],
    });
    const { result } = renderHook(() => useDirectMessages());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.ensureLoaded();
    });
    expect(mockFetch).toHaveBeenCalledWith('/api/messages', expect.anything());
    expect(result.current.messages).toHaveLength(2);
  });

  it('computes unreadCount only for messages addressed to current user once loaded', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [DM_UNREAD, DM_READ],
    });
    const { result } = renderHook(() => useDirectMessages());
    await act(async () => {
      await result.current.ensureLoaded();
    });
    // DM_UNREAD has recipient_id='m1' and read_at=null → unread for user m1
    // DM_READ has recipient_id='org1' → not for user m1
    expect(result.current.unreadCount).toBe(1);
  });

  it('sets loading false and empty messages when no user', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    const { result } = renderHook(() => useDirectMessages());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.messages).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('passes memberId query param when provided (fetches the thread on mount)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });
    renderHook(() => useDirectMessages('member-123'));
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    expect(mockFetch.mock.calls[0][0]).toBe('/api/messages?memberId=member-123');
  });

  it('handles fetch failure silently', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network'));
    const { result } = renderHook(() => useDirectMessages());
    await act(async () => {
      await result.current.ensureLoaded();
    });
    expect(result.current.messages).toEqual([]);
  });

  // ── sendMessage ───────────────────────────────────────────────────────────

  it('sends message via POST and prepends to list', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
    const { result } = renderHook(() => useDirectMessages());
    await act(async () => {
      await result.current.ensureLoaded();
    });

    const newMsg = { id: 'd-new', sender_id: 'm1', recipient_id: 'org1', message: 'Hello!' };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => newMsg,
    });

    await act(async () => {
      await result.current.sendMessage('org1', 'Hello!');
    });

    const postCall = mockFetch.mock.calls[1];
    expect(postCall[1].method).toBe('POST');
    const body = JSON.parse(postCall[1].body);
    expect(body.recipientId).toBe('org1');
    expect(body.message).toBe('Hello!');
    expect(result.current.messages[0].id).toBe('d-new');
  });

  it('throws when send fails', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
    const { result } = renderHook(() => useDirectMessages());
    await act(async () => {
      await result.current.ensureLoaded();
    });

    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Recipient not found.' }),
    });

    await expect(
      act(async () => {
        await result.current.sendMessage('bad', 'msg');
      }),
    ).rejects.toThrow('Recipient not found.');
  });

  // ── markAsRead (optimistic) ───────────────────────────────────────────────

  it('optimistically marks message as read', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [DM_UNREAD],
    });
    const { result } = renderHook(() => useDirectMessages());
    await act(async () => {
      await result.current.ensureLoaded();
    });
    expect(result.current.unreadCount).toBe(1);

    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    await act(async () => {
      await result.current.markAsRead('d1');
    });

    expect(result.current.unreadCount).toBe(0);
    expect(result.current.messages[0].read_at).toBeTruthy();

    const patchCall = mockFetch.mock.calls[1];
    expect(patchCall[0]).toBe('/api/messages/d1/read');
    expect(patchCall[1].method).toBe('PATCH');
  });

  // ── markAllAsRead ─────────────────────────────────────────────────────────

  it('marks all unread messages as read via batch endpoint', async () => {
    const anotherUnread = { ...DM_UNREAD, id: 'd3', message: 'Another one' };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [DM_UNREAD, anotherUnread],
    });
    const { result } = renderHook(() => useDirectMessages());
    await act(async () => {
      await result.current.ensureLoaded();
    });
    expect(result.current.unreadCount).toBe(2);

    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) });

    await act(async () => {
      await result.current.markAllAsRead();
    });

    expect(result.current.unreadCount).toBe(0);

    // Should use a single batch POST, not individual PATCH calls
    const batchCall = mockFetch.mock.calls[1];
    expect(batchCall[0]).toBe('/api/messages/read-all');
    expect(batchCall[1].method).toBe('POST');
  });

  // ── toggleReaction ──────────────────────────────────────────────────────

  it('optimistically adds a reaction and calls the API', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ ...DM_UNREAD, reactions: {} }],
    });
    const { result } = renderHook(() => useDirectMessages());
    await act(async () => {
      await result.current.ensureLoaded();
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ reactions: { '❤️': ['m1'] } }),
    });

    await act(async () => {
      await result.current.toggleReaction('d1', '❤️');
    });

    // Optimistic: reaction added immediately
    const msg = result.current.messages.find((m) => m.id === 'd1');
    expect(msg?.reactions?.['❤️']).toContain('m1');

    // API called
    const reactCall = mockFetch.mock.calls[1];
    expect(reactCall[0]).toBe('/api/messages/d1/react');
    expect(reactCall[1].method).toBe('POST');
    expect(JSON.parse(reactCall[1].body).emoji).toBe('❤️');
  });

  it('optimistically removes a reaction when toggled off', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ ...DM_UNREAD, reactions: { '😂': ['m1'] } }],
    });
    const { result } = renderHook(() => useDirectMessages());
    await act(async () => {
      await result.current.ensureLoaded();
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ reactions: {} }),
    });

    await act(async () => {
      await result.current.toggleReaction('d1', '😂');
    });

    const msg = result.current.messages.find((m) => m.id === 'd1');
    // Emoji key should be removed when user list empties
    expect(msg?.reactions?.['😂']).toBeUndefined();
  });

  it('refetches messages when reaction API fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ ...DM_UNREAD, reactions: {} }],
    });
    const { result } = renderHook(() => useDirectMessages());
    await act(async () => {
      await result.current.ensureLoaded();
    });

    // Reaction API fails
    mockFetch.mockResolvedValueOnce({ ok: false, json: async () => ({}) });
    // Refetch returns original data
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ ...DM_UNREAD, reactions: {} }],
    });

    await act(async () => {
      await result.current.toggleReaction('d1', '❤️');
    });

    // Should have refetched after failure (3 total calls: initial + react + refetch)
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });
});
