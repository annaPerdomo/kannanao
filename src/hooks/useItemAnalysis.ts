'use client';
import { useEffect, useState } from 'react';

import { fetchJsonCached, peekApiCache } from '@/lib/apiCache';
import { sb } from '@/lib/supabase';

export interface ItemAnalysisCard {
  cardId: string;
  word: string;
  reading: string | null;
  meaning: string | null;
  attemptCount: number;
  correctTotal: number;
  wrongTotal: number;
  strugglingCount: number;
  strugglingPct: number;
  classAccuracy: number;
}

export interface ItemAnalysis {
  deckId: string;
  deckName: string;
  deckEmoji: string | null;
  memberCount: number;
  cards: ItemAnalysisCard[];
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await sb.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Class-level "what to reteach" analysis for one deck. Passing a null deckId
 * (no deck picked yet) keeps the hook idle.
 */
export function useItemAnalysis(deckId: string | null) {
  const [analysis, setAnalysis] = useState<ItemAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!deckId) {
      setAnalysis(null);
      setError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const url = `/api/group/item-analysis?deckId=${deckId}`;
    const cached = peekApiCache<ItemAnalysis>(url);
    if (cached) setAnalysis(cached);
    setLoading(cached === undefined);
    setError(null);
    (async () => {
      try {
        const data = await fetchJsonCached<ItemAnalysis>(url, authHeaders);
        if (!cancelled) setAnalysis(data);
      } catch {
        if (!cancelled) setError('Failed to load analysis');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [deckId]);

  return { analysis, loading, error };
}
