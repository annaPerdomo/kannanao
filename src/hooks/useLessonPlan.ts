'use client';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { invalidateApiCache } from '@/lib/apiCache';
import { includedPlan } from '@/lib/lessonPlanEdits';
import { mergeWarmUp } from '@/lib/lessonWarmUp';
import { applyLessonPlan, buildLessonPlan, practiceSentencesCacheKey } from '@/services/api';
import type { ApplyDeckResult, LessonDocument, LessonPlan, WarmUpWord } from '@/types/lessonPlan';

export interface BuildPlanArgs {
  goal: string;
  weeks: number;
  cardsPerDeck: number;
  documents?: LessonDocument[];
  level?: string;
  styleNotes?: string;
  groupId?: string;
}

export interface ApplyPlanArgs {
  /** Decks are assigned to everyone in this group; later joiners are caught up. */
  groupId: string;
  firstDueDate: string;
  requiredAccuracy?: number | null;
  requiredMode?: string | null;
  withSentences?: boolean;
  level?: string;
  styleNotes?: string;
}

export function useLessonPlan() {
  const t = useTranslations('Group.lessonBuilder');
  const [plan, setPlan] = useState<LessonPlan | null>(null);
  const [warmUp, setWarmUp] = useState<WarmUpWord[]>([]);
  const [knownWords, setKnownWords] = useState<string[]>([]);
  /**
   * Identifies this plan across apply attempts. Applying creates decks one at a
   * time; if it dies half way, retrying with the same id resumes instead of
   * making a second copy of everything that already landed.
   */
  const [planId, setPlanId] = useState<string | null>(null);
  const [results, setResults] = useState<ApplyDeckResult[] | null>(null);
  const [building, setBuilding] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /**
   * A failed apply may have created some decks already; the retry finds them by
   * name and index. Excluding decks between attempts would renumber the rest
   * around decks that exist, so the review UI locks its ticks while this is set.
   */
  const [applyFailed, setApplyFailed] = useState(false);

  const build = useCallback(
    async (args: BuildPlanArgs) => {
      setBuilding(true);
      setError(null);
      setResults(null);
      setApplyFailed(false);
      try {
        const { documents, ...rest } = args;
        const data = await buildLessonPlan({
          ...rest,
          documents: documents?.map((d) => ({ path: d.path, mimeType: d.mimeType })),
        });
        setPlan(data.plan);
        setPlanId(uuidv4());
        setWarmUp(data.warmUp ?? []);
        setKnownWords(data.knownWords ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('errorMessage'));
        setPlan(null);
        setWarmUp([]);
        setKnownWords([]);
      } finally {
        setBuilding(false);
      }
    },
    [t],
  );

  const mergeWarmUpWords = useCallback((next: WarmUpWord[]) => {
    setWarmUp((current) => mergeWarmUp(current, next));
  }, []);

  const apply = useCallback(
    async (args: ApplyPlanArgs) => {
      if (!plan) return;
      const kept = includedPlan(plan);
      if (kept.decks.length === 0) return;
      setApplying(true);
      setError(null);
      try {
        const data = await applyLessonPlan({ ...args, plan: kept, planId: planId ?? undefined });
        setResults(data.results ?? []);
        invalidateApiCache('/api/group/');
        // The apply route seeds practice sentences server-side, so no client
        // write path drops the cached read that generation invalidates.
        for (const result of data.results ?? []) {
          if (result.deckId) invalidateApiCache(practiceSentencesCacheKey(result.deckId));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t('errorMessage'));
        setApplyFailed(true);
      } finally {
        setApplying(false);
      }
    },
    [plan, planId, t],
  );

  const reset = useCallback(() => {
    setPlan(null);
    setPlanId(null);
    setResults(null);
    setError(null);
    setApplyFailed(false);
    setWarmUp([]);
    setKnownWords([]);
  }, []);

  return {
    plan,
    setPlan,
    warmUp,
    knownWords,
    results,
    building,
    applying,
    applyFailed,
    error,
    build,
    apply,
    reset,
    mergeWarmUpWords,
  };
}
