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

import { type DirectMessage, enrichFromThread, useDirectMessages } from '@/hooks/useDirectMessages';

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

  // ── app icon badge (Badging API) ──────────────────────────────────────────

  function installBadgeApi() {
    const setAppBadge = vi.fn().mockResolvedValue(undefined);
    const clearAppBadge = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'setAppBadge', { value: setAppBadge, configurable: true });
    Object.defineProperty(navigator, 'clearAppBadge', { value: clearAppBadge, configurable: true });
    return {
      setAppBadge,
      clearAppBadge,
      uninstall: () => {
        delete (navigator as unknown as Record<string, unknown>).setAppBadge;
        delete (navigator as unknown as Record<string, unknown>).clearAppBadge;
      },
    };
  }

  it('mirrors the unread count onto the app icon badge', async () => {
    const badge = installBadgeApi();
    try {
      mockUnreadCount.mockReturnValue(3);
      renderHook(() => useDirectMessages());
      await waitFor(() => expect(badge.setAppBadge).toHaveBeenCalledWith(3));
    } finally {
      badge.uninstall();
    }
  });

  it('clears the icon badge when everything is read', async () => {
    const badge = installBadgeApi();
    try {
      mockUnreadCount.mockReturnValue(0);
      const { result } = renderHook(() => useDirectMessages());
      await waitFor(() => expect(result.current.loading).toBe(false));
      await waitFor(() => expect(badge.clearAppBadge).toHaveBeenCalled());
      expect(badge.setAppBadge).not.toHaveBeenCalled();
    } finally {
      badge.uninstall();
    }
  });

  it('re-asserts the icon badge on return to foreground even when the count is unchanged', async () => {
    // The service worker stamps the icon from a push's pre-read count; if the
    // page's own count never changes (message read the instant it landed), only
    // the visibilitychange re-sync can repair the icon.
    const badge = installBadgeApi();
    try {
      mockUnreadCount.mockReturnValue(0);
      const { result } = renderHook(() => useDirectMessages());
      await waitFor(() => expect(result.current.loading).toBe(false));
      await waitFor(() => expect(badge.clearAppBadge).toHaveBeenCalled());
      badge.clearAppBadge.mockClear();
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
      });
      await waitFor(() => expect(badge.clearAppBadge).toHaveBeenCalled());
    } finally {
      badge.uninstall();
    }
  });

  it('never touches the icon badge from a per-conversation instance', async () => {
    const badge = installBadgeApi();
    try {
      mockFetch.mockResolvedValue({ ok: true, json: async () => [DM_UNREAD] });
      const { result } = renderHook(() => useDirectMessages('org1'));
      await waitFor(() => expect(result.current.loading).toBe(false));
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
      });
      expect(badge.setAppBadge).not.toHaveBeenCalled();
      expect(badge.clearAppBadge).not.toHaveBeenCalled();
    } finally {
      badge.uninstall();
    }
  });

  // ── active conversation (realtime INSERT) ─────────────────────────────────

  function getInsertHandler(): (payload: { new: DirectMessage }) => void {
    const call = mockChannel.on.mock.calls.find(
      ([event, cfg]) => event === 'postgres_changes' && cfg.event === 'INSERT',
    );
    expect(call).toBeDefined();
    return call![2];
  }

  it('does not count a realtime message as unread when its chat is on screen', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [DM_READ] });
    const { result } = renderHook(() => useDirectMessages());
    await act(async () => {
      await result.current.ensureLoaded();
    });
    act(() => {
      result.current.setActiveConversation('org1');
      getInsertHandler()({ new: { ...DM_UNREAD, id: 'live1' } });
    });
    // The message lands in the list already marked read — badge stays at 0
    expect(result.current.messages.find((m) => m.id === 'live1')?.read_at).toBeTruthy();
    expect(result.current.unreadCount).toBe(0);
  });

  it('counts a realtime message as unread when a different chat is on screen', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [DM_READ] });
    const { result } = renderHook(() => useDirectMessages());
    await act(async () => {
      await result.current.ensureLoaded();
    });
    act(() => {
      result.current.setActiveConversation('someone-else');
      getInsertHandler()({ new: { ...DM_UNREAD, id: 'live2' } });
    });
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

  // ── loadOlder (endless scroll-back) ───────────────────────────────────────

  const fullPage = Array.from({ length: 50 }, (_, i) => ({
    ...DM_READ,
    id: `m${i}`,
    created_at: new Date(Date.UTC(2026, 4, 11, 10, 0, 59 - i)).toISOString(),
  }));

  it('loads older messages via loadOlder with a before cursor and dedupes', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => fullPage });
    const { result } = renderHook(() => useDirectMessages('org1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    // A full page means older history may exist
    expect(result.current.hasMore).toBe(true);

    // Older page: one duplicate of the current oldest + one genuinely new row
    const olderPage = [
      fullPage[49],
      { ...DM_READ, id: 'old1', created_at: '2026-05-11T08:00:00Z' },
    ];
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => olderPage });

    let added = 0;
    await act(async () => {
      added = await result.current.loadOlder();
    });

    const url = mockFetch.mock.calls[1][0] as string;
    expect(url).toContain('memberId=org1');
    expect(url).toContain(`before=${encodeURIComponent(fullPage[49].created_at)}`);
    expect(added).toBe(1);
    expect(result.current.messages).toHaveLength(51);
    expect(result.current.messages[50].id).toBe('old1');
    // Short page → reached the beginning of history
    expect(result.current.hasMore).toBe(false);
  });

  it('does not fetch older pages when the first page was short', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [DM_UNREAD, DM_READ] });
    const { result } = renderHook(() => useDirectMessages('org1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasMore).toBe(false);

    let added = -1;
    await act(async () => {
      added = await result.current.loadOlder();
    });
    expect(added).toBe(0);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('keeps older pages when the newest page is refetched', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => fullPage });
    const { result } = renderHook(() => useDirectMessages('org1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const olderPage = [{ ...DM_READ, id: 'old1', created_at: '2026-05-11T08:00:00Z' }];
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => olderPage });
    await act(async () => {
      await result.current.loadOlder();
    });
    expect(result.current.messages).toHaveLength(51);

    // A realtime-triggered refetch returns only the newest page — the older
    // history loaded via loadOlder must survive the merge.
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => fullPage });
    await act(async () => {
      await result.current.refetch();
    });
    expect(result.current.messages).toHaveLength(51);
    expect(result.current.messages[50].id).toBe('old1');
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

  it('forwards videoUrl in the POST body', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
    const { result } = renderHook(() => useDirectMessages());
    await act(async () => {
      await result.current.ensureLoaded();
    });

    const newMsg = {
      id: 'd-new-2',
      sender_id: 'm1',
      recipient_id: 'org1',
      video_url: 'https://x/a.mp4',
    };
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => newMsg });

    await act(async () => {
      await result.current.sendMessage('org1', '', undefined, 'https://x/a.mp4');
    });

    const postCall = mockFetch.mock.calls[1];
    const body = JSON.parse(postCall[1].body);
    expect(body.videoUrl).toBe('https://x/a.mp4');
    expect(result.current.messages[0].id).toBe('d-new-2');
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

// ─── enrichFromThread ──────────────────────────────────────────────────────────
// Reconstructs a realtime row's profile joins from the loaded thread so the hook
// can skip a full conversation refetch on every incoming message.

describe('enrichFromThread', () => {
  const thread: DirectMessage[] = [
    DM_UNREAD as DirectMessage, // org1 -> m1, has both profiles
    DM_READ as DirectMessage, // m1 -> org1
  ];

  const incoming: DirectMessage = {
    id: 'd99',
    sender_id: 'org1',
    recipient_id: 'm1',
    message: 'New message',
    read_at: null,
    created_at: '2026-05-12T10:00:00Z',
    // No sender/recipient joins — exactly what a realtime payload looks like.
  };

  it('reconstructs sender and recipient from cached messages', () => {
    const enriched = enrichFromThread(incoming, thread);
    expect(enriched).not.toBeNull();
    expect(enriched?.sender).toEqual({ display_name: 'Parent', username: 'parent' });
    expect(enriched?.recipient).toEqual({ display_name: 'Kid', username: 'kid' });
    // Original message content is preserved.
    expect(enriched?.message).toBe('New message');
  });

  it('returns null when a profile is not yet known (first message from a peer)', () => {
    const fromStranger: DirectMessage = { ...incoming, sender_id: 'stranger' };
    expect(enrichFromThread(fromStranger, thread)).toBeNull();
  });

  it('keeps joins already present on the row', () => {
    const preJoined: DirectMessage = {
      ...incoming,
      sender: { display_name: 'X', username: 'x' },
      recipient: { display_name: 'Y', username: 'y' },
    };
    const enriched = enrichFromThread(preJoined, []);
    expect(enriched?.sender).toEqual({ display_name: 'X', username: 'x' });
  });
});
