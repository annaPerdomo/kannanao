'use client';
import { useTranslations } from 'next-intl';
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

/**
 * @param scope required wherever the answer matters: an account can be both an
 * organizer and a learner in another group, so the role can't imply it.
 */
export function useAssignments(groupId?: string | null, enabled = true, scope?: 'mine' | 'given') {
  const t = useTranslations('Group.useAssignments');
  const params = new URLSearchParams();
  if (groupId) params.set('groupId', groupId);
  if (scope) params.set('scope', scope);
  const query = params.toString();
  const url = query ? `${ASSIGNMENTS_URL}?${query}` : ASSIGNMENTS_URL;
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
        setError(t('failedToLoad'));
      } finally {
        setLoading(false);
      }
    },
    [user, url, enabled, t],
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
        throw new Error(json?.error ?? t('failedToCreate'));
      }
      const data = await res.json();
      // Refetch to get full joined data
      await fetchAssignments();
      return data;
    },
    [fetchAssignments, groupId, t],
  );

  /**
   * A batch is one handout: every id gets the edit, partial failure throws a
   * translated error, and the list refetches exactly once — never per copy.
   */
  const updateAssignments = useCallback(
    async (
      ids: string[],
      updates: {
        title?: string | null;
        note?: string | null;
        dueDate?: string | null;
        requiredAccuracy?: number | null;
        requiredMode?: string | null;
      },
    ) => {
      const prev = assignments;
      const idSet = new Set(ids);
      const mapped: Partial<Assignment> = {};
      if ('title' in updates) mapped.title = updates.title ?? null;
      if ('note' in updates) mapped.note = updates.note ?? null;
      if ('dueDate' in updates) mapped.due_date = updates.dueDate ?? null;
      if ('requiredAccuracy' in updates)
        mapped.required_accuracy = updates.requiredAccuracy ?? null;
      if ('requiredMode' in updates) mapped.required_mode = updates.requiredMode ?? null;
      setAssignments((a) => a.map((item) => (idSet.has(item.id) ? { ...item, ...mapped } : item)));
      const headers = { 'Content-Type': 'application/json', ...(await authHeaders()) };
      const results = await Promise.allSettled(
        ids.map(async (id) => {
          const res = await fetch(`/api/group/assignments/${id}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(updates),
          });
          if (!res.ok) throw new Error();
        }),
      );
      const failed = results.filter((r) => r.status === 'rejected').length;
      if (failed === ids.length) {
        // Nothing landed (likely offline) — a refetch would fail too, so restore.
        setAssignments(prev);
        throw new Error(t('updateFailed'));
      }
      await fetchAssignments();
      if (failed > 0)
        throw new Error(t('updatePartial', { ok: ids.length - failed, total: ids.length }));
    },
    [assignments, fetchAssignments, t],
  );

  const deleteAssignments = useCallback(
    async (ids: string[]) => {
      const prev = assignments;
      const idSet = new Set(ids);
      setAssignments((a) => a.filter((item) => !idSet.has(item.id)));
      const headers = await authHeaders();
      const results = await Promise.allSettled(
        ids.map(async (id) => {
          const res = await fetch(`/api/group/assignments/${id}`, {
            method: 'DELETE',
            headers,
          });
          if (!res.ok) throw new Error();
        }),
      );
      const failed = results.filter((r) => r.status === 'rejected').length;
      if (failed === ids.length) {
        setAssignments(prev);
        throw new Error(t('deleteFailed'));
      }
      await fetchAssignments();
      if (failed > 0)
        throw new Error(t('deletePartial', { ok: ids.length - failed, total: ids.length }));
    },
    [assignments, fetchAssignments, t],
  );

  return {
    assignments,
    loading,
    error,
    createAssignment,
    updateAssignments,
    deleteAssignments,
    refetch: fetchAssignments,
  };
}
