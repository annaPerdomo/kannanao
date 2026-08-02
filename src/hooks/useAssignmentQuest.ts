'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { Assignment } from '@/hooks/useAssignments';
import { type GoalMode, isGoalMode } from '@/lib/assignmentMastery';
import {
  type AssignmentQuestState,
  clearQuestState,
  planAssignmentQuest,
  QUEST_PARAM,
  QUEST_PARAM_VALUE,
  type QuestLeg,
  questLegHref,
  readQuestState,
  writeQuestState,
} from '@/lib/assignmentQuest';
import { dbDeckCardCount } from '@/lib/supabase';
import type { Deck } from '@/types/deck';

/**
 * Store the quest and open its first leg — always flip study, so the jump needs
 * no deck data. `deck` is optional: it saves the leg page a card-count lookup,
 * and lets a goal the deck can't run fall back to the plain deck page instead
 * of walking the learner into a dead end.
 */
export function useStartAssignmentQuest() {
  const router = useRouter();
  return useCallback(
    (assignment: Assignment, deck?: Deck | null) => {
      const deckId = assignment.deck_id;
      const deckPage = () => router.push(`/deck/${deckId}`);
      const goal = isGoalMode(assignment.required_mode) ? assignment.required_mode : null;
      if (goal && !questLegHref(deckId, { step: 'goal', mode: goal })) return deckPage();
      if (goal === 'reading' && deck && deck.readingPractice !== true) return deckPage();

      const legs = planAssignmentQuest({
        cardCount: deck?.cardCount ?? 0,
        requiredMode: assignment.required_mode,
      });
      const href = questLegHref(deckId, legs[0]);
      if (!href) return deckPage();

      writeQuestState({
        assignmentId: assignment.id,
        deckId,
        requiredMode: assignment.required_mode,
        requiredAccuracy: assignment.required_accuracy,
        cardCount: deck?.cardCount ?? null,
        index: 0,
      });
      router.push(href);
    },
    [router],
  );
}

/** What a leg page needs to render quest chrome and hand off to the next leg. */
export interface ActiveQuest {
  state: AssignmentQuestState;
  legs: QuestLeg[];
  index: number;
  leg: QuestLeg;
  /** 'finish' once the goal leg's session is over. */
  phase: 'play' | 'finish';
  /** Bumped by `retry` so the page can remount the mode for a fresh session. */
  attempt: number;
  /** The one button the end-of-session screen shows instead of its exit. */
  handoff: { label: string; onNext: () => void };
  /** Leave the quest — header back, quit, or a mode that can't run. */
  abandon: () => void;
  /** Re-run the goal leg after a near miss. */
  retry: () => void;
  goHome: () => void;
}

/**
 * The quest as seen from one leg's route. Null whenever this page isn't a live
 * leg — no URL marker, no stored quest, another deck, or a stored step that
 * doesn't match the mode rendered here — and then the page behaves exactly as
 * it did before quests existed.
 */
export function useAssignmentQuest({
  deckId,
  mode,
}: {
  deckId: string;
  mode: GoalMode;
}): ActiveQuest | null {
  const t = useTranslations('AssignmentQuest');
  const router = useRouter();
  const searchParams = useSearchParams();
  const marked = searchParams?.get(QUEST_PARAM) === QUEST_PARAM_VALUE;

  const [state, setState] = useState<AssignmentQuestState | null>(null);
  const [phase, setPhase] = useState<'play' | 'finish'>('play');
  const [attempt, setAttempt] = useState(0);

  // sessionStorage is client-only, so the quest resolves after mount — the leg
  // pages are still loading cards then, so nothing visibly waits on it.
  useEffect(() => {
    if (!marked) {
      setState(null);
      return;
    }
    const stored = readQuestState();
    if (!stored || stored.deckId !== deckId) {
      if (stored) clearQuestState();
      setState(null);
      return;
    }
    setState(stored);
  }, [marked, deckId]);

  // Deck size decides whether there's a middle leg, so it is resolved once and
  // written back — a later leg must not renumber the steps. An unreadable deck
  // is a dead quest: drop it and leave the plain page.
  useEffect(() => {
    if (!state || state.cardCount !== null) return;
    let cancelled = false;
    void dbDeckCardCount(state.deckId).then((count) => {
      if (cancelled) return;
      if (count === null) {
        clearQuestState();
        setState(null);
        return;
      }
      const next = { ...state, cardCount: count };
      writeQuestState(next);
      setState(next);
    });
    return () => {
      cancelled = true;
    };
  }, [state]);

  const legs = useMemo(
    () =>
      state && state.cardCount !== null
        ? planAssignmentQuest({ cardCount: state.cardCount, requiredMode: state.requiredMode })
        : [],
    [state],
  );

  const leg = state ? legs[state.index] : undefined;
  // A stored step that doesn't match this page means the learner navigated by
  // hand — end the quest quietly. Advancing creates that same mismatch for the
  // instant before the next route takes over, so it is exempt: clearing there
  // would wipe the quest the page we're navigating to is about to read.
  const advancingRef = useRef(false);
  const matches = !!leg && leg.mode === mode;
  useEffect(() => {
    if (advancingRef.current) return;
    if (state && state.cardCount !== null && !matches) clearQuestState();
  }, [state, matches]);

  const stop = useCallback(() => {
    clearQuestState();
    setState(null);
  }, []);

  const abandon = useCallback(() => {
    stop();
    router.push(`/deck/${deckId}`);
  }, [stop, router, deckId]);

  const goHome = useCallback(() => {
    stop();
    router.push('/');
  }, [stop, router]);

  const advance = useCallback(() => {
    if (!state) return;
    const nextIndex = state.index + 1;
    const nextLeg = legs[nextIndex];
    const href = nextLeg ? questLegHref(state.deckId, nextLeg) : null;
    if (!href) {
      abandon();
      return;
    }
    advancingRef.current = true;
    const next = { ...state, index: nextIndex };
    writeQuestState(next);
    setState(next);
    router.replace(href);
  }, [state, legs, router, abandon]);

  const retry = useCallback(() => {
    setPhase('play');
    setAttempt((a) => a + 1);
  }, []);

  if (!state || !leg || !matches) return null;

  const isGoal = leg.step === 'goal';
  const nextLeg = legs[state.index + 1];
  const handoff = isGoal
    ? { label: t('seeHowYouDid'), onNext: () => setPhase('finish') }
    : {
        label: t('nextStep', { step: t(`stepName.${nextLeg?.step ?? 'goal'}`) }),
        onNext: advance,
      };

  return {
    state,
    legs,
    index: state.index,
    leg,
    phase,
    attempt,
    handoff,
    abandon,
    retry,
    goHome,
  };
}
