'use client';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { fetchJsonCached, peekApiCache } from '@/lib/apiCache';
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
  totals: { cards: number[]; xp: number[] };
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
  const [error, setError] = useState<string | null>(null);

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
    setLoading(cached === undefined);
    setError(null);
    (async () => {
      try {
        const data = await fetchJsonCached<GroupActivity>(url, authHeaders);
        if (!cancelled) setActivity(data);
      } catch {
        if (!cancelled) setError(t('loadFailed'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [groupId, days, t]);

  return { activity, loading, error };
}
