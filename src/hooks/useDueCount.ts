'use client';

import { useEffect, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { getDueCount } from '@/lib/supabase';

/**
 * How many cards are due for Smart Review right now. Loads client-side like the
 * other home widgets (assignments, leaderboard); `loading` stays true until the
 * first count resolves so the tile can avoid flashing a placeholder zero.
 */
export function useDueCount(): { dueCount: number; loading: boolean } {
  const { user } = useAuth();
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (!user) {
      setCount(0);
      return;
    }
    let cancelled = false;
    void getDueCount(user.id).then((c) => {
      if (!cancelled) setCount(c);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  return { dueCount: count ?? 0, loading: count === null };
}
