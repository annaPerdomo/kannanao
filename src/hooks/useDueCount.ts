'use client';

import { useEffect, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { type DataError, toDataError } from '@/lib/dataError';
import { getDueCount } from '@/lib/supabase';

/**
 * How many cards are due for Smart Review right now. Loads client-side like the
 * other home widgets (assignments, leaderboard); `loading` stays true until the
 * first count resolves so the tile can avoid flashing a placeholder zero.
 * `error` is set when the count couldn't load — consumers must NOT show
 * "all caught up" in that case (0-due and unknown are different states).
 */
export function useDueCount(): { dueCount: number; loading: boolean; error: DataError | null } {
  const { user } = useAuth();
  const [count, setCount] = useState<number | null>(null);
  const [error, setError] = useState<DataError | null>(null);

  useEffect(() => {
    if (!user) {
      setCount(0);
      return;
    }
    let cancelled = false;
    getDueCount(user.id)
      .then((c) => {
        if (!cancelled) setCount(c);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(toDataError(e));
        setCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  return { dueCount: count ?? 0, loading: count === null, error };
}
