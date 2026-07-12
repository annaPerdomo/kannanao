'use client';
import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { fetchJsonCached, invalidateApiCache, peekApiCache } from '@/lib/apiCache';
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
  /** Mastery goal: minimum session accuracy (0-100), or null for none. */
  required_accuracy: number | null;
  /** Mastery goal: required practice mode, or null for any. */
  required_mode: string | null;
  /** Best qualifying-session accuracy so far (student feedback). */
  progress_accuracy: number | null;
  decks?: { id: string; name: string; emoji: string | null } | null;
  profiles?: { display_name: string | null; username: string } | null;
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await sb.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const ASSIGNMENTS_URL = '/api/group/assignments';

export function useAssignments(groupId?: string | null, enabled = true) {
  const url = groupId ? `${ASSIGNMENTS_URL}?groupId=${groupId}` : ASSIGNMENTS_URL;
  // Seed from the cache so returning to a page paints instantly; the effect
  // below still revalidates stale data in the background.
  const [assignments, setAssignments] = useState<Assignment[]>(() => peekApiCache(url) ?? []);
  const [loading, setLoading] = useState(enabled && peekApiCache(url) === undefined);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const load = useCallback(
    async (freshMs?: number) => {
      if (!enabled || !user) {
        setAssignments([]);
        setLoading(false);
        return;
      }
      const cached = peekApiCache<Assignment[]>(url);
      if (cached) setAssignments(cached);
      setLoading(!cached);
      setError(null);
      try {
        const data = await fetchJsonCached<Assignment[]>(
          url,
          authHeaders,
          freshMs === undefined ? {} : { freshMs },
        );
        setAssignments(data);
      } catch {
        setError('Failed to load assignments');
      } finally {
        setLoading(false);
      }
    },
    [user, url, enabled],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const fetchAssignments = useCallback(() => {
    invalidateApiCache(ASSIGNMENTS_URL);
    return load(0);
  }, [load]);

  const createAssignment = useCallback(
    async (opts: {
      memberIds: string[];
      deckId: string;
      title?: string;
      note?: string;
      dueDate?: string;
      requiredAccuracy?: number;
      requiredMode?: string;
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
    async (
      id: string,
      updates: {
        title?: string;
        note?: string;
        dueDate?: string | null;
        requiredAccuracy?: number | null;
        requiredMode?: string | null;
      },
    ) => {
      const prev = assignments;
      // Map API keys to DB column names for optimistic update
      const mapped: Partial<Assignment> = {};
      if ('title' in updates) mapped.title = updates.title ?? null;
      if ('note' in updates) mapped.note = updates.note ?? null;
      if ('dueDate' in updates) mapped.due_date = updates.dueDate ?? null;
      if ('requiredAccuracy' in updates)
        mapped.required_accuracy = updates.requiredAccuracy ?? null;
      if ('requiredMode' in updates) mapped.required_mode = updates.requiredMode ?? null;
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
      invalidateApiCache(ASSIGNMENTS_URL);
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
