'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

import { LESSON_LIBRARY_CACHE_PREFIX } from '@/hooks/useLessonLibrary';
import { fetchJsonCached, peekApiCache } from '@/lib/apiCache';
import type { GroupWordInsight, LearnerWordInsight } from '@/lib/handoutWords';
import { sb } from '@/lib/supabase';

export interface HandoutWords {
  deck: { id: string; name: string; emoji: string | null };
  learnerCount: number;
  words: GroupWordInsight[];
  learner: LearnerWordInsight[] | null;
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await sb.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function buildUrl(groupId: string, deckId: string, memberId?: string | null): string {
  const params = new URLSearchParams({ groupId, deckId });
  if (memberId) params.set('memberId', memberId);
  return `${LESSON_LIBRARY_CACHE_PREFIX}/words?${params.toString()}`;
}

export function useHandoutWords(args: {
  groupId: string | null;
  deckId: string | null;
  memberId?: string | null;
  enabled: boolean;
}): {
  data: HandoutWords | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  const { groupId, deckId, memberId, enabled } = args;
  const url = enabled && groupId && deckId ? buildUrl(groupId, deckId, memberId) : null;
  const urlRef = useRef(url);
  urlRef.current = url;
  const [data, setData] = useState<HandoutWords | null>(() =>
    url ? (peekApiCache<HandoutWords>(url) ?? null) : null,
  );
  const [loading, setLoading] = useState(Boolean(url) && !data);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (forUrl: string, isCancelled: () => boolean, freshMs?: number) => {
    const cached = peekApiCache<HandoutWords>(forUrl);
    if (urlRef.current === forUrl) {
      setData(cached ?? null);
      setLoading(!cached);
      setError(null);
    }
    try {
      const result = await fetchJsonCached<HandoutWords>(forUrl, authHeaders, { freshMs });
      if (!isCancelled() && urlRef.current === forUrl) setData(result);
    } catch (err) {
      if (!isCancelled() && urlRef.current === forUrl) {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      if (!isCancelled() && urlRef.current === forUrl) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!url) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    void load(url, () => cancelled);
    return () => {
      cancelled = true;
    };
  }, [url, load]);

  const refetch = useCallback(async () => {
    if (!url) return;
    await load(url, () => false, 0);
  }, [url, load]);

  return { data, loading, error, refetch };
}
