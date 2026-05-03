'use client';
import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { sb } from '@/lib/supabase';

export interface Assignment {
  id: string;
  organizer_id: string;
  member_id: string;
  deck_id: string;
  title: string | null;
  note: string | null;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  decks?: { id: string; name: string; emoji: string | null } | null;
  profiles?: { display_name: string | null; username: string } | null;
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await sb.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function useAssignments(groupId?: string | null) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchAssignments = useCallback(async () => {
    if (!user) {
      setAssignments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const url = groupId ? `/api/group/assignments?groupId=${groupId}` : '/api/group/assignments';
      const res = await fetch(url, { headers: await authHeaders() });
      if (!res.ok) throw new Error('Failed to load assignments');
      const data = await res.json();
      setAssignments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  }, [user, groupId]);

  useEffect(() => {
    void fetchAssignments();
  }, [fetchAssignments]);

  const createAssignment = useCallback(
    async (opts: {
      memberIds: string[];
      deckId: string;
      title?: string;
      note?: string;
      dueDate?: string;
    }) => {
      const res = await fetch('/api/group/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({ ...opts, groupId }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error ?? 'Failed to create assignment');
      }
      const data = await res.json();
      // Refetch to get full joined data
      await fetchAssignments();
      return data;
    },
    [fetchAssignments, groupId],
  );

  const updateAssignment = useCallback(
    async (id: string, updates: { title?: string; note?: string; dueDate?: string | null }) => {
      const prev = assignments;
      // Map API keys to DB column names for optimistic update
      const mapped: Partial<Assignment> = {};
      if ('title' in updates) mapped.title = updates.title ?? null;
      if ('note' in updates) mapped.note = updates.note ?? null;
      if ('dueDate' in updates) mapped.due_date = updates.dueDate ?? null;
      setAssignments((a) => a.map((item) => (item.id === id ? { ...item, ...mapped } : item)));
      try {
        const res = await fetch(`/api/group/assignments/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
          body: JSON.stringify(updates),
        });
        if (!res.ok) throw new Error();
        await fetchAssignments();
      } catch {
        setAssignments(prev);
      }
    },
    [assignments, fetchAssignments],
  );

  const deleteAssignment = useCallback(
    async (id: string) => {
      const prev = assignments;
      setAssignments((a) => a.filter((item) => item.id !== id));
      try {
        const res = await fetch(`/api/group/assignments/${id}`, {
          method: 'DELETE',
          headers: await authHeaders(),
        });
        if (!res.ok) throw new Error();
      } catch {
        setAssignments(prev);
      }
    },
    [assignments],
  );

  return {
    assignments,
    loading,
    error,
    createAssignment,
    updateAssignment,
    deleteAssignment,
    refetch: fetchAssignments,
  };
}
