'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { isConfigured, sb } from '@/lib/supabase';

/** Play a sparkly magical chime using Web Audio API */
function playMessageSound() {
  try {
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    // Sparkle arpeggio: C6 → E6 → G6 → C7 with shimmer overtones
    const notes = [1047, 1319, 1568, 2093];
    notes.forEach((freq, i) => {
      const delay = i * 0.08;

      // Main tone (sine — soft and pure)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.12, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + delay);
      osc.stop(now + delay + 0.5);

      // Shimmer overtone (triangle — adds sparkle)
      const shimmer = ctx.createOscillator();
      const shimGain = ctx.createGain();
      shimmer.type = 'triangle';
      shimmer.frequency.value = freq * 2;
      shimGain.gain.setValueAtTime(0.04, now + delay);
      shimGain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.3);
      shimmer.connect(shimGain).connect(ctx.destination);
      shimmer.start(now + delay);
      shimmer.stop(now + delay + 0.3);
    });

    setTimeout(() => void ctx.close(), 900);
  } catch {
    // AudioContext not available (e.g. SSR, denied autoplay)
  }
}

export interface DirectMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  message: string | null;
  image_url?: string | null;
  reactions?: Record<string, string[]> | null;
  read_at: string | null;
  created_at: string;
  sender?: { display_name: string | null; username: string } | null;
  recipient?: { display_name: string | null; username: string } | null;
}

type Profile = NonNullable<DirectMessage['sender']>;

// Find a person's profile among already-loaded messages: it appears as `sender`
// on messages they sent and as `recipient` on messages sent to them.
function profileFor(userId: string, known: DirectMessage[]): Profile | null {
  for (const m of known) {
    if (m.sender_id === userId && m.sender) return m.sender;
    if (m.recipient_id === userId && m.recipient) return m.recipient;
  }
  return null;
}

// Reconstruct a realtime row's sender/recipient profile joins from messages
// already in the thread, so we don't have to refetch the conversation just to
// resolve display names. Returns null if either profile is unknown (e.g. the
// first message from a new peer), signalling the caller to fall back to a fetch.
export function enrichFromThread(row: DirectMessage, known: DirectMessage[]): DirectMessage | null {
  const sender = row.sender ?? profileFor(row.sender_id, known);
  const recipient = row.recipient ?? profileFor(row.recipient_id, known);
  if (!sender || !recipient) return null;
  return { ...row, sender, recipient };
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await sb.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Page size the API returns — a full page means older history may exist. */
const PAGE_SIZE = 50;

/** Merge a fresh page over the existing list: fresh rows win per id, everything
 * else (e.g. older pages loaded via loadOlder) is kept, sorted newest-first. */
function mergeMessages(fresh: DirectMessage[], prev: DirectMessage[]): DirectMessage[] {
  const freshIds = new Set(fresh.map((m) => m.id));
  const merged = [...fresh, ...prev.filter((m) => !freshIds.has(m.id))];
  return merged.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
}

export function useDirectMessages(memberId?: string, initialUnreadCount?: number) {
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [unreadCountState, setUnreadCountState] = useState(initialUnreadCount ?? 0);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const { user } = useAuth();
  const channelRef = useRef<ReturnType<typeof sb.channel> | null>(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const loadedRef = useRef(loaded);
  loadedRef.current = loaded;
  const hasMoreRef = useRef(hasMore);
  hasMoreRef.current = hasMore;
  const loadingOlderRef = useRef(false);

  // Once the full list is loaded, derive the count from it so optimistic
  // read/markAll updates reflect instantly. Until then (the common case — every
  // page mounts the global provider just for the nav badge) use the cheap
  // count-only query so we never pull the full message list to count unread.
  const unreadCount = loaded
    ? messages.filter((m) => !m.read_at && m.recipient_id === user?.id).length
    : unreadCountState;

  // Mirror the unread count onto the installed-app icon badge. iOS home-screen
  // web apps need this explicit Badging API call (Android badges from
  // notifications automatically); the service worker keeps it in sync while the
  // app is closed, and this effect handles the app-open case — including
  // clearing it the moment messages are read. Only the global provider (no
  // memberId) owns the badge: a per-conversation instance only knows its own
  // thread's unread count, not the user's total.
  useEffect(() => {
    if (memberId) return;
    if (typeof navigator === 'undefined' || !('setAppBadge' in navigator)) return;
    // setAppBadge/clearAppBadge ship together (same spec), but guard each anyway
    // so a partial implementation can't throw.
    const nav = navigator as Navigator & {
      setAppBadge?: (count?: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };
    if (unreadCount > 0) nav.setAppBadge?.(unreadCount).catch(() => {});
    else nav.clearAppBadge?.().catch(() => {});
  }, [memberId, unreadCount]);

  const refreshUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadCountState(0);
      return;
    }
    const { count, error } = await sb
      .from('direct_messages')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', user.id)
      .is('read_at', null);
    // On error `count` comes back null — leave the previous badge intact rather
    // than incorrectly clearing the unread indicator to 0.
    if (error) return;
    setUnreadCountState(count ?? 0);
  }, [user]);

  const fetchMessages = useCallback(async () => {
    if (!user) {
      setMessages([]);
      setLoading(false);
      return;
    }
    try {
      const url = memberId ? `/api/messages?memberId=${memberId}` : '/api/messages';
      const res = await fetch(url, { headers: await authHeaders() });
      if (!res.ok) throw new Error();
      const data: DirectMessage[] = await res.json();
      // Merge rather than replace so pages loaded via loadOlder survive the
      // refetches triggered by realtime events and error rollbacks.
      setMessages((prev) => mergeMessages(data, prev));
      // Only the first load decides whether older history exists — refetches
      // of the newest page would wrongly resurrect hasMore after the user
      // already scrolled to the very beginning.
      if (memberId && !loadedRef.current) setHasMore(data.length >= PAGE_SIZE);
      setLoaded(true);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [user, memberId]);

  /** Loads the full message list on demand (notifications page / opening a chat). */
  const ensureLoaded = useCallback(async () => {
    if (loadedRef.current) return;
    await fetchMessages();
  }, [fetchMessages]);

  /** Loads the next page of older messages (infinite scroll back through
   * history). Returns the number of messages actually appended. */
  const loadOlder = useCallback(async (): Promise<number> => {
    if (!user || !memberId || loadingOlderRef.current || !hasMoreRef.current) return 0;
    const oldest = messagesRef.current[messagesRef.current.length - 1];
    if (!oldest) return 0;
    loadingOlderRef.current = true;
    setLoadingOlder(true);
    try {
      const url = `/api/messages?memberId=${memberId}&before=${encodeURIComponent(oldest.created_at)}`;
      const res = await fetch(url, { headers: await authHeaders() });
      if (!res.ok) throw new Error();
      const page: DirectMessage[] = await res.json();
      setHasMore(page.length >= PAGE_SIZE);
      const known = new Set(messagesRef.current.map((m) => m.id));
      const fresh = page.filter((m) => !known.has(m.id));
      if (fresh.length) {
        setMessages((prev) => {
          const ids = new Set(prev.map((m) => m.id));
          return [...prev, ...fresh.filter((m) => !ids.has(m.id))];
        });
      }
      return fresh.length;
    } catch {
      // Keep hasMore so the user can retry by scrolling again
      return 0;
    } finally {
      loadingOlderRef.current = false;
      setLoadingOlder(false);
    }
  }, [user, memberId]);

  useEffect(() => {
    // The identity (user/memberId) changed, so any previously-loaded full list
    // is stale. Reset `loaded` so the unread badge uses the count-only query
    // again and ensureLoaded() will refetch on demand (e.g. after re-login).
    // Clear the list too — merging the new conversation's fetch into the old
    // one's messages would mix threads.
    setLoaded(false);
    setMessages([]);
    setHasMore(false);
    setLoadingOlder(false);
    loadingOlderRef.current = false;
    if (!user) {
      setUnreadCountState(0);
      setLoading(false);
      return;
    }
    // A specific conversation (memberId) loads its full thread up front. The
    // global provider only needs the unread count — the full list loads lazily.
    if (memberId) {
      setLoading(true);
      void fetchMessages();
    } else {
      setLoading(false);
      // Skip the count query when the server already seeded the unread count.
      if (initialUnreadCount === undefined) void refreshUnreadCount();
    }
  }, [user, memberId, fetchMessages, refreshUnreadCount, initialUnreadCount]);

  // Supabase Realtime: subscribe to new messages and read receipt updates
  useEffect(() => {
    if (!user || !isConfigured()) return;

    const channelName = memberId ? `dm:${user.id}:${memberId}` : `dm:${user.id}`;
    const channel = sb
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `recipient_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as DirectMessage;
          // When filtering by memberId, only accept messages from that member
          if (memberId && row.sender_id !== memberId) return;
          if (loadedRef.current) {
            // Guard against duplicate INSERT deliveries
            if (messagesRef.current.some((m) => m.id === row.id)) return;
            // The realtime payload is the raw row without the sender/recipient
            // profile joins. In a loaded thread we've already seen both people,
            // so reconstruct the joins from cached messages instead of paying a
            // full conversation refetch on every incoming message. Only the very
            // first message from a brand-new peer falls back to a refetch.
            const enriched = enrichFromThread(row, messagesRef.current);
            if (!enriched) {
              setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [row, ...prev]));
              void fetchMessages();
            } else {
              setMessages((prev) =>
                prev.some((m) => m.id === row.id) ? prev : [enriched, ...prev],
              );
            }
          } else {
            // Full list isn't loaded — just keep the unread badge accurate.
            void refreshUnreadCount();
          }
          // Chime only while the app is in the foreground. When the tab is
          // hidden or the app is closed, the server push notification alerts the
          // user instead — the service worker shows that push exactly when no
          // window is visible, so the user never gets both a chime and a push.
          if (typeof document !== 'undefined' && !document.hidden) {
            playMessageSound();
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'direct_messages',
          filter: `sender_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as DirectMessage;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === row.id ? { ...m, read_at: row.read_at, reactions: row.reactions } : m,
            ),
          );
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'direct_messages',
          filter: `recipient_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as DirectMessage;
          if (loadedRef.current) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === row.id ? { ...m, read_at: row.read_at, reactions: row.reactions } : m,
              ),
            );
          } else {
            // A message to me changed (e.g. marked read) — refresh the badge.
            void refreshUnreadCount();
          }
        },
      )
      .subscribe();

    channelRef.current = channel;
    return () => {
      void sb.removeChannel(channel);
      channelRef.current = null;
    };
  }, [user, memberId, fetchMessages, refreshUnreadCount]);

  const sendMessage = useCallback(
    async (recipientId: string, message: string, imageUrl?: string) => {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({ recipientId, message: message || undefined, imageUrl }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error ?? 'Failed to send message');
      }
      const newMsg = await res.json();
      setMessages((prev) => [newMsg, ...prev]);
      return newMsg;
    },
    [],
  );

  const markAsRead = useCallback(
    async (id: string) => {
      // Skip if this isn't a message addressed to the current user
      const msg = messagesRef.current.find((m) => m.id === id);
      if (!msg || msg.recipient_id !== user?.id) return;
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, read_at: new Date().toISOString() } : m)),
      );
      try {
        const res = await fetch(`/api/messages/${id}/read`, {
          method: 'PATCH',
          headers: await authHeaders(),
        });
        if (!res.ok) await fetchMessages();
      } catch {
        await fetchMessages();
      }
    },
    [fetchMessages, user?.id],
  );

  const markAllAsRead = useCallback(async () => {
    // Optimistic update — use functional updater to avoid stale closure
    setMessages((prev) =>
      prev.map((m) =>
        !m.read_at && m.recipient_id === user?.id ? { ...m, read_at: new Date().toISOString() } : m,
      ),
    );
    // Single batch API call instead of N individual requests
    try {
      const res = await fetch('/api/messages/read-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify(memberId ? { senderId: memberId } : {}),
      });
      if (!res.ok) await fetchMessages();
    } catch {
      await fetchMessages();
    }
  }, [user?.id, memberId, fetchMessages]);

  const toggleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!user) return;
      // Optimistic update
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m;
          const reactions = { ...(m.reactions || {}) };
          const users = reactions[emoji] || [];
          if (users.includes(user.id)) {
            const remaining = users.filter((uid) => uid !== user.id);
            if (remaining.length === 0) delete reactions[emoji];
            else reactions[emoji] = remaining;
          } else {
            reactions[emoji] = [...users, user.id];
          }
          return { ...m, reactions };
        }),
      );
      try {
        const res = await fetch(`/api/messages/${messageId}/react`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
          body: JSON.stringify({ emoji }),
        });
        if (!res.ok) await fetchMessages();
      } catch {
        await fetchMessages();
      }
    },
    [user, fetchMessages],
  );

  return {
    messages,
    unreadCount,
    loading,
    hasMore,
    loadingOlder,
    loadOlder,
    ensureLoaded,
    sendMessage,
    markAsRead,
    markAllAsRead,
    toggleReaction,
    refetch: fetchMessages,
  };
}
