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
 * Start the quest for an assignment: store the plan's inputs and open the first
 * leg. The first leg is always flip study, so no deck data is needed to make
 * the jump — `deck` only saves the leg page a card-count lookup and lets an
 * unwinnable goal (a mode the deck can't run) fall back to the plain deck page
 * instead of walking the learner into a dead end.
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
  /** Index of the leg being played (0-based). */
  index: number;
  leg: QuestLeg;
  /** 'play' while the leg runs, 'finish' once the goal leg's session is over. */
  phase: 'play' | 'finish';
  /** Bumped by `retry` so the page can remount the mode for a fresh session. */
  attempt: number;
  /** The one button the end-of-session screen shows. */
  handoff: { label: string; onNext: () => void };
  /** Leave the quest (header back, quit, a mode that can't run) — never traps. */
  abandon: () => void;
  /** Re-run the goal leg after a near miss. */
  retry: () => void;
  /** Finish for now and go back to the dashboard. */
  goHome: () => void;
}

/**
 * The quest as seen from one leg's route. Returns null whenever this page isn't
 * a live quest leg — no marker in the URL, no stored quest, a different deck,
 * or a stored step that doesn't match the mode being rendered. In every one of
 * those cases the page is left exactly as it was before the quest existed.
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

  // sessionStorage is client-only, so the quest resolves after mount. The leg
  // pages are already loading cards at that point, so nothing visibly waits.
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

  // The deck size decides whether the quest has a middle leg, so it is resolved
  // once and written back — otherwise a later leg could renumber the steps. A
  // deck that can't be read is a dead quest: drop it and leave the plain page.
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
  // A stored step that doesn't match what this page renders means the learner
  // navigated by hand (or the plan changed under us) — end the quest quietly.
  // Advancing deliberately creates that mismatch for the instant before the
  // next leg's route takes over, so it is exempt: clearing there would wipe the
  // quest the page we are navigating to is about to read.
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
