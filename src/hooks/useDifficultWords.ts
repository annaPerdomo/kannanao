'use client';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { fetchJsonCached, peekApiCache } from '@/lib/apiCache';
import type { DifficultWordReason } from '@/lib/difficultWords';
import { sb } from '@/lib/supabase';

export interface DifficultWord {
  cardId: string;
  deckId: string;
  deckName: string;
  deckEmoji: string | null;
  word: string;
  reading: string | null;
  meaning: string | null;
  reason: DifficultWordReason;
  /** Learners the reason is about, out of `learnerCount` who have tried the card. */
  learnersAffected: number;
  learnerCount: number;
  attemptCount: number;
  classAccuracy: number;
}

export interface DifficultWords {
  /** Everyone in the group, which is a larger number than any card's `learnerCount`. */
  learnerCount: number;
  decks: { id: string; name: string; emoji: string | null }[];
  words: DifficultWord[];
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await sb.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Group-wide difficult words, optionally narrowed to one deck. The dashboard
 * mounts this twice — once for the needs-attention panel and once for the Words
 * tab — and the shared api cache collapses the "all decks" pair into one fetch.
 */
export function useDifficultWords(groupId: string | null, deckId?: string | null) {
  const t = useTranslations('Group.useDifficultWords');
  const [data, setData] = useState<DifficultWords | null>(null);
  // True from the first frame: the effect below runs only after that frame has
  // painted, and `loading: false` with no data renders as "no decks assigned".
  const [loading, setLoading] = useState(!!groupId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!groupId) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const url = `/api/group/difficult-words?groupId=${groupId}${deckId ? `&deckId=${deckId}` : ''}`;
    const cached = peekApiCache<DifficultWords>(url);
    if (cached) setData(cached);
    setLoading(cached === undefined);
    setError(null);
    (async () => {
      try {
        const fresh = await fetchJsonCached<DifficultWords>(url, authHeaders);
        if (!cancelled) setData(fresh);
      } catch {
        if (!cancelled) setError(t('failedToLoad'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [groupId, deckId]);

  return { data, loading, error };
}
