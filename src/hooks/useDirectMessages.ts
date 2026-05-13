'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { isConfigured, sb } from '@/lib/supabase';

export interface DirectMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  message: string;
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
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            return [row, ...prev];
          });
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
      .subscribe();

    channelRef.current = channel;
    return () => {
      void sb.removeChannel(channel);
      channelRef.current = null;
    };
  }, [user, memberId]);

  const sendMessage = useCallback(async (recipientId: string, message: string) => {
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
      body: JSON.stringify({ recipientId, message }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      throw new Error(json?.error ?? 'Failed to send message');
    }
    const newMsg = await res.json();
    setMessages((prev) => [newMsg, ...prev]);
    return newMsg;
  }, []);

  const markAsRead = useCallback(
    async (id: string) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, read_at: new Date().toISOString() } : m)),
      );
      try {
        await fetch(`/api/messages/${id}/read`, {
          method: 'PATCH',
          headers: await authHeaders(),
        });
      } catch {
        await fetchMessages();
      }
    },
    [fetchMessages],
  );

  const markAllAsRead = useCallback(async () => {
    const unread = messages.filter((m) => !m.read_at && m.recipient_id === user?.id);
    setMessages((prev) =>
      prev.map((m) =>
        !m.read_at && m.recipient_id === user?.id ? { ...m, read_at: new Date().toISOString() } : m,
      ),
    );
    const headers = await authHeaders();
    await Promise.all(
      unread.map((m) =>
        fetch(`/api/messages/${m.id}/read`, {
          method: 'PATCH',
          headers,
        }).catch(() => {}),
      ),
    );
  }, [messages, user?.id]);

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
