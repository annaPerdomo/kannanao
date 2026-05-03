'use client';
import { useEffect, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { sb } from '@/lib/supabase';

export interface LeaderboardEntry {
  id: string;
  username: string;
  displayName: string | null;
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

export function useGroupLeaderboard(groupId?: string | null) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setLeaderboard([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const url = groupId
          ? `/api/group/leaderboard?groupId=${groupId}`
          : '/api/group/leaderboard';
        const res = await fetch(url, { headers: await authHeaders() });
        if (!res.ok) throw new Error();
        const data = await res.json();
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
  }, [user, groupId]);

  return { leaderboard, loading };
}
