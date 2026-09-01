'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { DataError, toDataError } from '@/lib/dataError';
import { type KanaProgressMap, kanaProgressMap } from '@/lib/kanaProficiency';
import { nextSchedule } from '@/lib/srs';
import { getKanaProgress, upsertKanaProgress } from '@/lib/supabase';

const START_INTERVAL_DAYS = 0;
const START_EASE = 2.5;

// `byKana` stays null until the first load resolves: defaulting to an empty map
// would render an outage as "no stars yet" and re-lock the learner's progress.
export function useKanaProgress(): {
  byKana: KanaProgressMap | null;
  loading: boolean;
  error: DataError | null;
  retry: () => void;
  record: (kana: string, correct: boolean) => Promise<void>;
} {
  const { user } = useAuth();
  const [byKana, setByKana] = useState<KanaProgressMap | null>(null);
  const [error, setError] = useState<DataError | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Mirrors `byKana` so `record` can read and roll back the live map without a
  // state updater — updaters run twice in StrictMode and must stay pure.
  const mapRef = useRef<KanaProgressMap | null>(null);
  const apply = useCallback((map: KanaProgressMap | null) => {
    mapRef.current = map;
    setByKana(map);
  }, []);

  useEffect(() => {
    if (!user) {
      apply(new Map());
      return;
    }
    let cancelled = false;
    setError(null);
    getKanaProgress(user.id)
      .then((rows) => {
        if (!cancelled) apply(kanaProgressMap(rows));
      })
      .catch((e) => {
        if (cancelled) return;
        setError(toDataError(e));
      });
    return () => {
      cancelled = true;
    };
  }, [user, reloadKey, apply]);

  const retry = useCallback(() => {
    apply(null);
    setError(null);
    setReloadKey((n) => n + 1);
  }, [apply]);

  const record = useCallback(
    async (kana: string, correct: boolean) => {
      const prev = mapRef.current;
      if (!prev) {
        await upsertKanaProgress(kana, correct);
        return;
      }

      const before = prev.get(kana);
      // Mirror the schedule the RPC applies server-side, or the island keeps
      // saying "time to review" for the characters just answered.
      const schedule = nextSchedule({
        correct,
        intervalDays: before?.intervalDays ?? START_INTERVAL_DAYS,
        ease: before?.ease ?? START_EASE,
      });

      const optimistic = new Map(prev);
      optimistic.set(kana, {
        correctCount: (before?.correctCount ?? 0) + (correct ? 1 : 0),
        wrongCount: (before?.wrongCount ?? 0) + (correct ? 0 : 1),
        nextReviewAt: schedule.nextReviewAt.toISOString(),
        intervalDays: schedule.intervalDays,
        ease: schedule.ease,
      });
      apply(optimistic);

      if (await upsertKanaProgress(kana, correct)) return;

      const rolledBack = new Map(mapRef.current ?? optimistic);
      if (before) rolledBack.set(kana, before);
      else rolledBack.delete(kana);
      apply(rolledBack);
      setError(new DataError('upstream', 'Could not save kana progress'));
    },
    [apply],
  );

  return { byKana, loading: byKana === null && !error, error, retry, record };
}
