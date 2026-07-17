'use client';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { fetchJsonCached, peekApiCache } from '@/lib/apiCache';
import type { QuizScoreRow } from '@/lib/quiz';
import { sb } from '@/lib/supabase';

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await sb.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Organizer view of per-member quiz standings for one deck. Read-only; scoped
 * server-side to the organizer's own members (optionally one group). Returns
 * `[]` until a deck is selected.
 */
export function useQuizResults(deckId: string | null, groupId?: string | null) {
  const url = deckId
    ? `/api/group/quiz-results?deckId=${deckId}${groupId ? `&groupId=${groupId}` : ''}`
    : null;
  const [rows, setRows] = useState<QuizScoreRow[]>(() => (url ? (peekApiCache(url) ?? []) : []));
  const [loading, setLoading] = useState(
    Boolean(url) && (url ? peekApiCache(url) === undefined : false),
  );
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const t = useTranslations('Group.quizScores');

  const load = useCallback(async () => {
    if (!url || !user) {
      setRows([]);
      setLoading(false);
      return;
    }
    const cached = peekApiCache<QuizScoreRow[]>(url);
    if (cached) setRows(cached);
    setLoading(!cached);
    setError(null);
    try {
      const data = await fetchJsonCached<QuizScoreRow[]>(url, authHeaders);
      setRows(data);
    } catch {
      setError(t('loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [url, user, t]);

  useEffect(() => {
    void load();
  }, [load]);

  return { rows, loading, error, refetch: load };
}
