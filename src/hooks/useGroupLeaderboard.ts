'use client';
import { useEffect, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { fetchJsonCached, peekApiCache } from '@/lib/apiCache';
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
  const { user } = useAuth();

  useEffect(() => {
    if (!enabled || !user) {
      setLeaderboard([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const cached = peekApiCache<LeaderboardEntry[]>(url);
    if (cached) setLeaderboard(cached);
    setLoading(cached === undefined);
    (async () => {
      try {
        const data = await fetchJsonCached<LeaderboardEntry[]>(url, authHeaders);
        if (!cancelled) setLeaderboard(data);
      } catch {
        // silently fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, url, enabled]);

  return { leaderboard, loading };
}
