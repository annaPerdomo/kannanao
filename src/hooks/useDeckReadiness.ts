'use client';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { fetchJsonCached, peekApiCache, peekApiCacheMeta } from '@/lib/apiCache';
import { type DataError, toDataError } from '@/lib/dataError';
import { sb } from '@/lib/supabase';

export interface DeckReadiness {
  deckId: string;
  deckName: string;
  deckEmoji: string | null;
  cardCount: number;
  /**
   * Learners the deck is assigned to, not the group headcount:
   * strong + learning + unseen = learnerCount × cardCount.
   */
  learnerCount: number;
  /** Member-card pairs by SRS tier (same boundaries as the members rollup). */
  strong: number;
  learning: number;
  unseen: number;
  /** Group accuracy on the deck's cards; null until someone has answered one. */
  accuracyPct: number | null;
  strugglingLearnerIds: string[];
}

export interface DeckReadinessData {
  /** Weakest deck first (lowest strong-fraction). */
  decks: DeckReadiness[];
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await sb.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Per-deck readiness rollup for one group's assigned decks. Organizer-only. */
export function useDeckReadiness(groupId: string | null) {
  const t = useTranslations('Group.useDeckReadiness');
  const [data, setData] = useState<DeckReadinessData | null>(null);
  // True from the first frame: the effect below runs only after that frame has
  // painted, and `loading: false` with no data renders as "no decks assigned".
  const [loading, setLoading] = useState(!!groupId);
  const [error, setError] = useState<DataError | null>(null);
  const [stale, setStale] = useState(false);

  useEffect(() => {
    if (!groupId) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const url = `/api/group/readiness?groupId=${groupId}`;
    const cached = peekApiCache<DeckReadinessData>(url);
    if (cached) setData(cached);
    setStale(peekApiCacheMeta(url)?.stale ?? false);
    setLoading(cached === undefined);
    setError(null);
    (async () => {
      try {
        const fresh = await fetchJsonCached<DeckReadinessData>(url, authHeaders);
        if (!cancelled) setData(fresh);
      } catch (err) {
        if (!cancelled) setError(toDataError(err));
      } finally {
        if (!cancelled) {
          setStale(peekApiCacheMeta(url)?.stale ?? false);
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [groupId]);

  return { data, loading, error, errorMessage: error ? t('failedToLoad') : null, stale };
}
