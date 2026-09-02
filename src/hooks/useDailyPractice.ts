'use client';
import { useEffect, useMemo, useState } from 'react';

import { useAssignments } from '@/hooks/useAssignments';
import { useDecks } from '@/hooks/useDecks';
import { useDueCount } from '@/hooks/useDueCount';
import { useKanaProgress } from '@/hooks/useKanaProgress';
import { localDateString } from '@/lib/chest';
import { type FocusPick, pickFocusDeck, readDailyRound } from '@/lib/dailyPractice';
import type { DataError } from '@/lib/dataError';
import { KANA_WAIT_MS, pickQuestKana } from '@/lib/quest';

export interface DailyFocus {
  dueCount: number;
  kanaDue: boolean;
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

  // Only asked when no words are due: that is the one day the characters
  // decide whether there is a review leg at all.
  const kanaWanted = enabled && !dueLoading && !dueError && dueCount === 0;
  const { byKana, error: kanaError } = useKanaProgress(kanaWanted);
  const [kanaTimedOut, setKanaTimedOut] = useState(false);
  useEffect(() => {
    if (!kanaWanted || byKana || kanaError) return;
    const timer = setTimeout(() => setKanaTimedOut(true), KANA_WAIT_MS);
    return () => clearTimeout(timer);
  }, [kanaWanted, byKana, kanaError]);
  const kanaSettled = !kanaWanted || byKana !== null || !!kanaError || kanaTimedOut;
  const kanaDue = kanaWanted && !!byKana && pickQuestKana(byKana).length > 0;

  const loading = dueLoading || assignmentsLoading || decksLoading || !kanaSettled;
  // An assignments failure is swallowed on purpose: it only costs the homework-first pick.
  const error = dueError ?? decksError ?? (decks.length === 0 ? assignmentsError : null);

  const focus = useMemo(() => {
    if (loading) return null;
    const today = localDateString(new Date());
    return pickFocusDeck(assignments, decks, today, readDailyRound(today));
  }, [loading, assignments, decks]);

  return {
    dueCount,
    kanaDue,
    focus,
    empty: !loading && !error && dueCount === 0 && !kanaDue && focus === null,
    loading,
    error,
    retry: () => {
      retry();
      retryDecks();
      void refetch();
    },
  };
}
