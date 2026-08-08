'use client';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { invalidateApiCache } from '@/lib/apiCache';
import { applyLessonPlan, buildLessonPlan } from '@/services/api';
import type { ApplyDeckResult, LessonDocument, LessonPlan } from '@/types/lessonPlan';

export interface BuildPlanArgs {
  goal: string;
  weeks: number;
  cardsPerDeck: number;
  documents?: LessonDocument[];
  level?: string;
  styleNotes?: string;
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

  const build = useCallback(
    async (args: BuildPlanArgs) => {
      setBuilding(true);
      setError(null);
      setResults(null);
      try {
        const { documents, ...rest } = args;
        const data = await buildLessonPlan({
          ...rest,
          documents: documents?.map((d) => ({ base64: d.base64, mimeType: d.mimeType })),
        });
        setPlan(data.plan);
        setPlanId(uuidv4());
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
        const data = await applyLessonPlan({ ...args, plan, planId: planId ?? undefined });
        setResults(data.results ?? []);
        invalidateApiCache('/api/group/');
      } catch (err) {
        setError(err instanceof Error ? err.message : t('errorMessage'));
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
  }, []);

  return { plan, setPlan, results, building, applying, error, build, apply, reset };
}
