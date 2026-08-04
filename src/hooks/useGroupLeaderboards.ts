'use client';
import { useEffect, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { fetchJsonCached, peekApiCache } from '@/lib/apiCache';
import { sb } from '@/lib/supabase';

import type { LeaderboardEntry } from './useGroupLeaderboard';

/** One group's ranking. A learner in two groups gets one of these per group. */
export interface GroupBoard {
  groupId: string;
  groupName: string;
  groupEmoji: string | null;
  entries: LeaderboardEntry[];
}

const URL = '/api/group/leaderboards';

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await sb.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Every leaderboard the account belongs on, one per group. Use this wherever a
 * surface isn't already scoped to a single group — `useGroupLeaderboard` is for
 * a group page, which knows which group it is showing.
 */
export function useGroupLeaderboards(enabled = true) {
  const [boards, setBoards] = useState<GroupBoard[]>(() => peekApiCache(URL) ?? []);
  const [loading, setLoading] = useState(enabled && peekApiCache(URL) === undefined);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!enabled || !user) {
      setBoards([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const cached = peekApiCache<GroupBoard[]>(URL);
    if (cached) setBoards(cached);
    setLoading(cached === undefined);
    (async () => {
      try {
        const data = await fetchJsonCached<GroupBoard[]>(URL, authHeaders);
        if (cancelled) return;
        setBoards(data);
        setError(null);
      } catch (err) {
        // Returned but not rendered: the dashboard shows "check back" rather
        // than an error box for a board that failed to load.
        if (!cancelled)
          setError(err instanceof Error ? err.message : 'Failed to load leaderboards');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, enabled]);

  return { boards, loading, error };
}
