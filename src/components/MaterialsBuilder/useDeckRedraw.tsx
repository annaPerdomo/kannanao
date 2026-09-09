'use client';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';

import { attachPlanImages } from '@/lib/lessonImages';
import { includedCards } from '@/lib/lessonPlanEdits';
import { CARDS_MAX, CARDS_MIN, GOAL_MAX } from '@/lib/lessonPrompts';
import { buildLessonPlan } from '@/services/api';
import type { LessonPlan, WarmUpWord } from '@/types/lessonPlan';

import { effectiveStyleNotes, type LessonSetForm } from './constants';

interface DeckRedrawArgs {
  plan: LessonPlan | null;
  form: LessonSetForm;
  groupId: string;
  setPlan: (updater: (current: LessonPlan | null) => LessonPlan | null) => void;
  mergeWarmUpWords: (words: WarmUpWord[]) => void;
}

/** Redrawing one deck of a plan: the whole-plan build lives in useLessonPlan. */
export function useDeckRedraw({ plan, form, groupId, setPlan, mergeWarmUpWords }: DeckRedrawArgs) {
  const t = useTranslations('Group.lessonBuilder');
  const [retryingIndex, setRetryingIndex] = useState<number | null>(null);
  const [retryError, setRetryError] = useState<string | null>(null);

  /** Redraw one deck rather than the whole plan — the common case when one lands badly. */
  const handleRetryDeck = useCallback(
    async (index: number) => {
      if (!plan) return;
      setRetryingIndex(index);
      setRetryError(null);
      try {
        const deck = plan.decks[index];
        const data = await buildLessonPlan({
          goal: t('retryGoal', { goal: form.goal, deck: deck.name }),
          weeks: 1,
          // The known-word filter can shrink a deck below the route's minimum.
          cardsPerDeck: Math.min(
            CARDS_MAX,
            Math.max(CARDS_MIN, deck.cards?.length || form.cardsPerDeck),
          ),
          documents: form.documents.map((d) => ({ path: d.path, mimeType: d.mimeType })),
          level: form.level,
          styleNotes: effectiveStyleNotes(form),
          groupId,
          readingLevel: form.readingLevel,
        });
        const replacementPlan = form.generateImages ? await attachPlanImages(data.plan) : data.plan;
        const replacement = replacementPlan.decks[0];
        if (replacement) {
          setPlan((current) =>
            current
              ? { decks: current.decks.map((d, i) => (i === index ? replacement : d)) }
              : current,
          );
          mergeWarmUpWords(data.warmUp ?? []);
        }
      } catch (err) {
        setRetryError(err instanceof Error ? err.message : t('errorMessage'));
      } finally {
        setRetryingIndex(null);
      }
    },
    [plan, form, groupId, setPlan, mergeWarmUpWords, t],
  );

  /**
   * Keep the approved cards exactly as they are and generate fresh
   * replacements only for the gap — the unapproved ones, plus however many
   * more the educator asked for by raising the target count.
   */
  const handleRegenerateUnapproved = useCallback(
    async (index: number, targetCount: number) => {
      if (!plan) return;
      const deck = plan.decks[index];
      const approved = includedCards(deck);
      const needed = Math.min(CARDS_MAX, Math.max(0, targetCount - approved.length));

      if (needed === 0) {
        setPlan((current) =>
          current
            ? {
                decks: current.decks.map((d, i) => (i === index ? { ...d, cards: approved } : d)),
              }
            : current,
        );
        return;
      }

      setRetryingIndex(index);
      setRetryError(null);
      try {
        const data = await buildLessonPlan({
          goal: t('regenerateGoal', {
            goal: form.goal,
            deck: deck.name,
            words: approved.map((c) => c.word).join('、') || t('regenerateNoWords'),
          }).slice(0, GOAL_MAX),
          weeks: 1,
          // Gemini's floor is CARDS_MIN even when fewer are actually needed;
          // the extras are trimmed off below.
          cardsPerDeck: Math.min(CARDS_MAX, Math.max(CARDS_MIN, needed)),
          documents: form.documents.map((d) => ({ path: d.path, mimeType: d.mimeType })),
          level: form.level,
          styleNotes: effectiveStyleNotes(form),
          groupId,
          readingLevel: form.readingLevel,
        });
        const generatedPlan = form.generateImages ? await attachPlanImages(data.plan) : data.plan;
        const fresh = (generatedPlan.decks[0]?.cards ?? []).slice(0, needed);
        setPlan((current) =>
          current
            ? {
                decks: current.decks.map((d, i) =>
                  i === index ? { ...d, cards: [...approved, ...fresh] } : d,
                ),
              }
            : current,
        );
        mergeWarmUpWords(data.warmUp ?? []);
      } catch (err) {
        setRetryError(err instanceof Error ? err.message : t('errorMessage'));
      } finally {
        setRetryingIndex(null);
      }
    },
    [plan, form, groupId, setPlan, mergeWarmUpWords, t],
  );
  return { retryingIndex, retryError, handleRetryDeck, handleRegenerateUnapproved };
}
