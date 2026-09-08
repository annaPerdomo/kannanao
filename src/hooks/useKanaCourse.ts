'use client';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';

import { fetchJsonCached, invalidateApiCache } from '@/lib/apiCache';
import type { KanaCourseDeckNeed, KanaCourseWeek } from '@/lib/kanaCourse';
import { sb } from '@/lib/supabase';

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await sb.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface KanaCourseSource {
  needs: KanaCourseDeckNeed[];
  deckCount: number;
}

export interface ApplyKanaCourseArgs {
  groupId: string;
  weeks: KanaCourseWeek[];
  requiredAccuracy?: number | null;
}

export interface KanaCourseResults {
  assigned: string[];
  failed: string[];
  memberCount: number;
}

export function useKanaCourse() {
  const t = useTranslations('Materials.kanaCourse');
  const [source, setSource] = useState<KanaCourseSource | null>(null);
  const [loadingSource, setLoadingSource] = useState(false);
  const [applying, setApplying] = useState(false);
  const [results, setResults] = useState<KanaCourseResults | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSource = useCallback(
    async (groupId: string, cancelled: () => boolean = () => false) => {
      setLoadingSource(true);
      setError(null);
      try {
        const data = await fetchJsonCached<KanaCourseSource>(
          `/api/group/kana-course/source?groupId=${encodeURIComponent(groupId)}`,
          authHeaders,
        );
        if (!cancelled()) setSource(data);
        return data;
      } catch (err) {
        if (cancelled()) return null;
        setSource(null);
        setError(err instanceof Error ? err.message : t('sourceError'));
        return null;
      } finally {
        if (!cancelled()) setLoadingSource(false);
      }
    },
    [t],
  );

  const apply = useCallback(
    async (args: ApplyKanaCourseArgs) => {
      setApplying(true);
      setError(null);
      try {
        const res = await fetch('/api/group/kana-course/apply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
          body: JSON.stringify(args),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error ?? t('applyError'));
        setResults(data as KanaCourseResults);
        invalidateApiCache('/api/group/assignments');
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : t('applyError'));
        return false;
      } finally {
        setApplying(false);
      }
    },
    [t],
  );

  const reset = useCallback(() => {
    setResults(null);
    setError(null);
  }, []);

  return { source, loadingSource, applying, results, error, loadSource, apply, reset };
}
