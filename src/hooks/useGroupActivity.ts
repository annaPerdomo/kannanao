'use client';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { fetchJsonCached, peekApiCache, peekApiCacheMeta } from '@/lib/apiCache';
import { type DataError, toDataError } from '@/lib/dataError';
import { sb } from '@/lib/supabase';

export interface GroupActivityMember {
  id: string;
  name: string;
  /** Cards studied per day, aligned to `days`. */
  daily: number[];
}

export interface GroupActivityModeStat {
  mode: string;
  sessions: number;
  cardsStudied: number;
  cardsCorrect: number;
  accuracy: number;
}

export interface GroupActivity {
  /** ISO dates, oldest → newest. */
  days: string[];
  totals: { cards: number[]; xp: number[]; correct: number[]; durationSecs: number[] };
  members: GroupActivityMember[];
  /** Cards-studied descending, over the same window as `days`. */
  modeBreakdown: GroupActivityModeStat[];
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await sb.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Daily study activity for the group's charts. The timezone offset travels with
 * the request so the server buckets days the way the reader's calendar does.
 */
export function useGroupActivity(groupId: string | null, days = 14) {
  const t = useTranslations('Group.charts');
  const [activity, setActivity] = useState<GroupActivity | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<DataError | null>(null);
  const [stale, setStale] = useState(false);

  useEffect(() => {
    if (!groupId) {
      setActivity(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const tzOffset = -new Date().getTimezoneOffset();
    const url = `/api/group/activity?groupId=${groupId}&days=${days}&tzOffset=${tzOffset}`;
    const cached = peekApiCache<GroupActivity>(url);
    if (cached) setActivity(cached);
    setStale(peekApiCacheMeta(url)?.stale ?? false);
    setLoading(cached === undefined);
    setError(null);
    (async () => {
      try {
        const data = await fetchJsonCached<GroupActivity>(url, authHeaders);
        if (!cancelled) setActivity(data);
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
  }, [groupId, days]);

  return { activity, loading, error, errorMessage: error ? t('loadFailed') : null, stale };
}
