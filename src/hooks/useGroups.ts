'use client';
import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { sb } from '@/lib/supabase';

export interface Group {
  id: string;
  organizer_id: string;
  name: string;
  emoji: string | null;
  pinned: boolean;
  show_leaderboard: boolean;
  created_at: string;
  memberCount: number;
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await sb.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function useGroups(enabled = true) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const { user, isMemberAccount } = useAuth();

  const fetchGroups = useCallback(async () => {
    if (!enabled || !user || isMemberAccount) {
      setGroups([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/group/groups', { headers: await authHeaders() });
      if (!res.ok) throw new Error('Failed to load groups');
      const data = await res.json();
      setGroups(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load groups');
    } finally {
      setLoading(false);
    }
  }, [user, isMemberAccount, enabled]);

  useEffect(() => {
    void fetchGroups();
  }, [fetchGroups]);

  const createGroup = useCallback(async (name: string, emoji?: string): Promise<Group> => {
    const res = await fetch('/api/group/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
      body: JSON.stringify({ name, emoji }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error ?? 'Failed to create group');
    }
    const group: Group = await res.json();
    setGroups((prev) => [...prev, group]);
    return group;
  }, []);

  const updateGroup = useCallback(
    async (
      id: string,
      updates: {
        name?: string;
        emoji?: string | null;
        pinned?: boolean;
        show_leaderboard?: boolean;
      },
    ) => {
      const prev = groups;
      setGroups((g) => g.map((item) => (item.id === id ? { ...item, ...updates } : item)));
      try {
        const res = await fetch(`/api/group/groups/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
          body: JSON.stringify(updates),
        });
        if (!res.ok) throw new Error();
      } catch {
        setGroups(prev);
      }
    },
    [groups],
  );

  const deleteGroup = useCallback(
    async (id: string) => {
      const prev = groups;
      setGroups((g) => g.filter((item) => item.id !== id));
      try {
        const res = await fetch(`/api/group/groups/${id}`, {
          method: 'DELETE',
          headers: await authHeaders(),
        });
        if (!res.ok) throw new Error();
      } catch {
        setGroups(prev);
      }
    },
    [groups],
  );

  const pinGroup = useCallback(
    async (id: string, pinned: boolean) => {
      await updateGroup(id, { pinned });
    },
    [updateGroup],
  );

  return {
    groups,
    loading,
    error,
    createGroup,
    updateGroup,
    deleteGroup,
    pinGroup,
    refetch: fetchGroups,
  };
}
