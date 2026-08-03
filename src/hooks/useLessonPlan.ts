'use client';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';

import { invalidateApiCache } from '@/lib/apiCache';
import { applyLessonPlan, buildLessonPlan } from '@/services/api';
import type { ApplyDeckResult, LessonPlan, PlanKnownWord } from '@/types/lessonPlan';

export interface BuildPlanArgs {
  memberId: string;
  goal: string;
  weeks: number;
  cardsPerDeck: number;
}

export interface ApplyPlanArgs {
  groupId: string;
  memberId: string;
  firstDueDate: string;
  requiredAccuracy?: number | null;
  requiredMode?: string | null;
}

export function useLessonPlan() {
  const t = useTranslations('Group.lessonBuilder');
  const [plan, setPlan] = useState<LessonPlan | null>(null);
  const [knownWords, setKnownWords] = useState<PlanKnownWord[]>([]);
  const [results, setResults] = useState<ApplyDeckResult[] | null>(null);
  const [building, setBuilding] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const build = useCallback(
    async (args: BuildPlanArgs) => {
      setBuilding(true);
      setError(null);
      setResults(null);
      try {
        const data = await buildLessonPlan(args);
        setPlan(data.plan);
        setKnownWords(data.knownWords ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('errorMessage'));
        setPlan(null);
      } finally {
        setBuilding(false);
      }
    },
    [t],
  );

  const apply = useCallback(
    async (args: ApplyPlanArgs) => {
      if (!plan) return;
      setApplying(true);
      setError(null);
      try {
        const data = await applyLessonPlan({ ...args, plan });
        setResults(data.results ?? []);
        invalidateApiCache('/api/group/');
      } catch (err) {
        setError(err instanceof Error ? err.message : t('errorMessage'));
      } finally {
        setApplying(false);
      }
    },
    [plan, t],
  );

  const reset = useCallback(() => {
    setPlan(null);
    setKnownWords([]);
    setResults(null);
    setError(null);
  }, []);

  return { plan, setPlan, knownWords, results, building, applying, error, build, apply, reset };
}
