'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { isConfigured, sb } from '@/lib/supabase';

/** Show a browser notification when the tab is hidden (user is on another tab). */
function showTabNotification(msg: DirectMessage) {
  if (typeof document === 'undefined' || !document.hidden) return;
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  const name = msg.sender?.display_name ?? msg.sender?.username ?? 'Someone';
  const body = msg.message ?? (msg.image_url ? '📷 Sent a photo' : 'New message');
  const n = new Notification(name, {
    body,
    icon: '/icons/icon-192.png',
    tag: `dm-${msg.id}`,
  });
  n.onclick = () => {
    window.focus();
    n.close();
  };
}

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
  read_at: string | null;
  created_at: string;
  sender?: { display_name: string | null; username: string } | null;
  recipient?: { display_name: string | null; username: string } | null;
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await sb.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function useDirectMessages(memberId?: string) {
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const channelRef = useRef<ReturnType<typeof sb.channel> | null>(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const unreadCount = messages.filter((m) => !m.read_at && m.recipient_id === user?.id).length;

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
      const data = await res.json();
      setMessages(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [user, memberId]);

  useEffect(() => {
    void fetchMessages();
  }, [fetchMessages]);

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
          // Guard against duplicate INSERT deliveries
          if (messagesRef.current.some((m) => m.id === row.id)) return;
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            return [row, ...prev];
          });
          playMessageSound();
          showTabNotification(row);
          // Refetch to populate sender/recipient profile joins
          void fetchMessages();
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
            prev.map((m) => (m.id === row.id ? { ...m, read_at: row.read_at } : m)),
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
          setMessages((prev) =>
            prev.map((m) => (m.id === row.id ? { ...m, read_at: row.read_at } : m)),
          );
        },
      )
      .subscribe();

    channelRef.current = channel;
    return () => {
      void sb.removeChannel(channel);
      channelRef.current = null;
    };
  }, [user, memberId, fetchMessages]);

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

  return {
    messages,
    unreadCount,
    loading,
    sendMessage,
    markAsRead,
    markAllAsRead,
    refetch: fetchMessages,
  };
}
