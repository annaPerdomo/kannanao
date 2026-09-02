'use client';
import { useMemo } from 'react';

import { useAssignments } from '@/hooks/useAssignments';
import { useDecks } from '@/hooks/useDecks';
import { useDueCount } from '@/hooks/useDueCount';
import { localDateString } from '@/lib/chest';
import { type FocusPick, pickFocusDeck, readDailyRound } from '@/lib/dailyPractice';
import type { DataError } from '@/lib/dataError';

export interface DailyFocus {
  dueCount: number;
  focus: FocusPick | null;
  empty: boolean;
  loading: boolean;
  error: DataError | null;
  retry: () => void;
}

export function useDailyFocus(enabled = true): DailyFocus {
  const { dueCount, loading: dueLoading, error: dueError, retry } = useDueCount();
  const {
    assignments,
    loading: assignmentsLoading,
    error: assignmentsError,
    refetch,
  } = useAssignments(undefined, enabled, 'mine');
  const { decks, loading: decksLoading, error: decksError, retry: retryDecks } = useDecks(enabled);

  const loading = dueLoading || assignmentsLoading || decksLoading;
  // An assignments failure is swallowed on purpose: it only costs the homework-first pick.
  const error = dueError ?? decksError ?? (decks.length === 0 ? assignmentsError : null);

  const focus = useMemo(() => {
    if (loading) return null;
    const today = localDateString(new Date());
    return pickFocusDeck(assignments, decks, today, readDailyRound(today));
  }, [loading, assignments, decks]);

  return {
    dueCount,
    focus,
    empty: !loading && !error && dueCount === 0 && focus === null,
    loading,
    error,
    retry: () => {
      retry();
      retryDecks();
      void refetch();
    },
  };
}
