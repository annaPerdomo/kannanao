'use client';
import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { sb } from '@/lib/supabase';

export interface Encouragement {
  id: string;
  organizer_id: string;
  member_id: string;
  message: string;
  emoji: string;
  read_at: string | null;
  created_at: string;
  profiles?: { display_name: string | null; username: string } | null;
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await sb.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function useEncouragements() {
  const [encouragements, setEncouragements] = useState<Encouragement[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const unreadCount = encouragements.filter((e) => !e.read_at).length;

  const fetchEncouragements = useCallback(async () => {
    if (!user) {
      setEncouragements([]);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/group/encouragements', { headers: await authHeaders() });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setEncouragements(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void fetchEncouragements();
  }, [fetchEncouragements]);

  const sendEncouragement = useCallback(
    async (memberId: string, message: string, emoji?: string) => {
      const res = await fetch('/api/group/encouragements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({ memberId, message, emoji }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error ?? 'Failed to send encouragement');
      }
      return res.json();
    },
    [],
  );

  const markAsRead = useCallback(
    async (id: string) => {
      setEncouragements((prev) =>
        prev.map((e) => (e.id === id ? { ...e, read_at: new Date().toISOString() } : e)),
      );
      try {
        await fetch(`/api/group/encouragements/${id}/read`, {
          method: 'PATCH',
          headers: await authHeaders(),
        });
      } catch {
        // rollback
        await fetchEncouragements();
      }
    },
    [fetchEncouragements],
  );

  const markAllAsRead = useCallback(async () => {
    const unread = encouragements.filter((e) => !e.read_at);
    setEncouragements((prev) =>
      prev.map((e) => (!e.read_at ? { ...e, read_at: new Date().toISOString() } : e)),
    );
    await Promise.all(
      unread.map((e) =>
        fetch(`/api/group/encouragements/${e.id}/read`, {
          method: 'PATCH',
          headers: authHeaders() as unknown as HeadersInit,
        }).catch(() => {}),
      ),
    );
  }, [encouragements]);

  return {
    encouragements,
    unreadCount,
    loading,
    sendEncouragement,
    markAsRead,
    markAllAsRead,
    refetch: fetchEncouragements,
  };
}
