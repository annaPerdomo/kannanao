'use client';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { fetchJsonCached, peekApiCache, peekApiCacheMeta } from '@/lib/apiCache';
import { type DataError, toDataError } from '@/lib/dataError';
import { sb } from '@/lib/supabase';

export interface LeaderboardEntry {
  id: string;
  username: string;
  displayName: string | null;
  avatar?: string | null;
  weeklyXp: number;
  weeklyCards: number;
  streakDays: number;
  level: number;
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await sb.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function useGroupLeaderboard(groupId?: string | null, enabled = true) {
  const url = groupId ? `/api/group/leaderboard?groupId=${groupId}` : '/api/group/leaderboard';
  // Seed from the cache so returning to a page paints instantly; the effect
  // below still revalidates stale data in the background.
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() => peekApiCache(url) ?? []);
  const [loading, setLoading] = useState(enabled && peekApiCache(url) === undefined);
  const [error, setError] = useState<DataError | null>(null);
  const [stale, setStale] = useState(() => peekApiCacheMeta(url)?.stale ?? false);
  const { user } = useAuth();
  const t = useTranslations('Group.leaderboard');

  useEffect(() => {
    if (!enabled || !user) {
      setLeaderboard([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const cached = peekApiCache<LeaderboardEntry[]>(url);
    if (cached) setLeaderboard(cached);
    setStale(peekApiCacheMeta(url)?.stale ?? false);
    setLoading(cached === undefined);
    (async () => {
      try {
        const data = await fetchJsonCached<LeaderboardEntry[]>(url, authHeaders);
        if (!cancelled) {
          setLeaderboard(data);
          setError(null);
        }
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
  }, [user, url, enabled]);

  return { leaderboard, loading, error, errorMessage: error ? t('loadFailed') : null, stale };
}
