'use client';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

import { fetchJsonCached, peekApiCache } from '@/lib/apiCache';
import { sb } from '@/lib/supabase';
import type { LessonLibrary } from '@/types/lessonUnit';

export const LESSON_LIBRARY_CACHE_PREFIX = '/api/group/lessons';

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await sb.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function useLessonLibrary(groupId: string | null): {
  library: LessonLibrary | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  const t = useTranslations('Materials.library');
  const url = groupId ? `${LESSON_LIBRARY_CACHE_PREFIX}?groupId=${groupId}` : null;
  const [library, setLibrary] = useState<LessonLibrary | null>(() =>
    url ? (peekApiCache<LessonLibrary>(url) ?? null) : null,
  );
  const [loading, setLoading] = useState(Boolean(url) && !library);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (isCancelled: () => boolean = () => false) => {
      if (!url) {
        setLibrary(null);
        setLoading(false);
        setError(null);
        return;
      }
      const cached = peekApiCache<LessonLibrary>(url);
      // No cache hit: clear the previous group's data instead of leaving it on screen.
      setLibrary(cached ?? null);
      setLoading(!cached);
      setError(null);
      try {
        const data = await fetchJsonCached<LessonLibrary>(url, authHeaders);
        if (!isCancelled()) setLibrary(data);
      } catch {
        if (!isCancelled()) setError(t('loadError'));
      } finally {
        if (!isCancelled()) setLoading(false);
      }
    },
    [url, t],
  );

  useEffect(() => {
    let cancelled = false;
    void load(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [load]);

  const refetch = useCallback(() => load(), [load]);

  return { library, loading, error, refetch };
}
