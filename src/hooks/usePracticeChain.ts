'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { PRACTICE_CONFIG } from '@/components/Deck/constants';
import { useAuth } from '@/contexts/AuthContext';
import { useBuddyFriendshipCtx } from '@/contexts/BuddyFriendshipContext';
import type { Assignment } from '@/hooks/useAssignments';
import { type GoalMode, isGoalMode } from '@/lib/assignmentMastery';
import { planAssignmentQuest } from '@/lib/assignmentQuest';
import { countStrengths } from '@/lib/cardStrength';
import { localDateString } from '@/lib/chest';
import { bumpDailyRound, type FocusPick, planDailyPractice } from '@/lib/dailyPractice';
import { isMeaningfulSession } from '@/lib/friendship';
import { deckSupport, pickMixedSessionCards, planMixedPractice } from '@/lib/mixedPractice';
import {
  CHAIN_PARAM,
  type ChainLeg,
  chainLegHref,
  clearChainState,
  type PracticeChainState,
  readChainState,
  writeChainState,
} from '@/lib/practiceChain';
import { onSessionEnd } from '@/lib/sessionSignal';
import { dbDeckCardCount, getCardProgressForUser, loadCards } from '@/lib/supabase';
import { fetchPracticeSentences } from '@/services/api';
import type { Deck } from '@/types/deck';
import type { Flashcard } from '@/types/flashcard';

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
      if (assignment.kana_set) {
        return router.push(`/review/learn-kana?set=${encodeURIComponent(assignment.kana_set)}`);
      }
      const deckId = assignment.deck_id;
      if (!deckId) return;
      const deckPage = () => router.push(`/deck/${deckId}`);
      const goal = isGoalMode(assignment.required_mode) ? assignment.required_mode : null;
      if (goal && !chainLegHref(deckId, { step: 'goal', mode: goal }, 'assignment')) {
        return deckPage();
      }
      if ((goal === 'reading' || goal === 'kanji-match') && deck && deck.readingPractice !== true) {
        return deckPage();
      }

      const legs = planAssignmentQuest({
        cardCount: deck?.cardCount ?? 0,
        requiredMode: assignment.required_mode,
      });
      const href = chainLegHref(deckId, legs[0], 'assignment');
      if (!href) return deckPage();

      writeChainState({
        kind: 'assignment',
        deckId,
        index: 0,
        legs: null,
        cardIds: null,
        assignmentId: assignment.id,
        requiredMode: assignment.required_mode,
        requiredAccuracy: assignment.required_accuracy,
        cardCount: deck?.cardCount ?? null,
      });
      router.push(href);
    },
    [router],
  );
}

/**
 * The deck page's one Practice button. Unlike a quest the plan depends on how
 * well this learner knows these cards, so it is built once here — after the one
 * progress read — and carried in the chain state rather than re-derived.
 */
export function useStartMixedPractice() {
  const router = useRouter();
  const { user, isMemberAccount } = useAuth();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(
    async (
      deckId: string,
      cards: Flashcard[],
      support: { readingUnlocked: boolean; ttsReady: boolean },
    ) => {
      setStarting(true);
      setError(null);
      try {
        // A member's legacy personalised set can differ from the shared one, so
        // count the set the mode will play or the rung dead-ends. A failed read
        // must cost the rung, not the button.
        const [progress, sentences] = await Promise.all([
          user
            ? getCardProgressForUser(
                user.id,
                cards.map((c) => c.id),
              )
            : Promise.resolve([]),
          fetchPracticeSentences(
            deckId,
            isMemberAccount ? (user?.id ?? undefined) : undefined,
          ).catch(() => []),
        ]);
        // Plan against the cards this session will actually play, not the deck:
        // if none of the twelve carry an example sentence there is no Fill leg.
        const session = pickMixedSessionCards(cards, progress);
        const legs = planMixedPractice({
          support: deckSupport(session, { ...support, sentenceCount: sentences.length }),
          counts: countStrengths(
            session.map((c) => c.id),
            progress,
          ),
        });
        const href = legs.length > 0 ? chainLegHref(deckId, legs[0], 'mixed') : null;
        if (!href) return;
        writeChainState({
          kind: 'mixed',
          deckId,
          index: 0,
          legs,
          cardIds: session.map((c) => c.id),
          assignmentId: null,
          requiredMode: null,
          requiredAccuracy: null,
          cardCount: session.length,
        });
        router.push(href);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not start mixed practice');
      } finally {
        // Cleared on the way out too — the deck page outlives a failed
        // navigation, and a permanently busy button is unclickable.
        setStarting(false);
      }
    },
    [router, user, isMemberAccount],
  );

  return { start, starting, error };
}

/** Resolves false when there is nothing to play, so the launcher can say so. */
export function useStartDailyPractice() {
  const router = useRouter();
  const { user, isMemberAccount } = useAuth();
  return useCallback(
    async (
      focus: FocusPick | null,
      dueCount: number,
      ttsReady: boolean,
      kanaDue = false,
    ): Promise<boolean> => {
      const cards = focus ? await loadCards(focus.deckId) : [];
      const [progress, sentences] = await Promise.all([
        focus && user
          ? getCardProgressForUser(
              user.id,
              cards.map((c) => c.id),
            )
          : Promise.resolve([]),
        focus
          ? fetchPracticeSentences(
              focus.deckId,
              isMemberAccount ? (user?.id ?? undefined) : undefined,
            ).catch(() => [])
          : Promise.resolve([]),
      ]);
      const legs = planDailyPractice({
        dueCount,
        kanaDue,
        focus,
        cards,
        progress,
        ttsReady,
        sentenceCount: sentences.length,
      });
      const deckId = focus?.deckId ?? '';
      const href = legs.length > 0 ? chainLegHref(deckId, legs[0], 'daily') : null;
      if (!href) return false;
      // Only a chain that plays this deck can settle its assignment.
      const playsDeck = legs.some((leg) => leg.deckId === deckId);
      writeChainState({
        kind: 'daily',
        deckId,
        index: 0,
        legs,
        cardIds: null,
        assignmentId: playsDeck ? (focus?.assignment?.id ?? null) : null,
        requiredMode: playsDeck ? (focus?.assignment?.requiredMode ?? null) : null,
        requiredAccuracy: playsDeck ? (focus?.assignment?.requiredAccuracy ?? null) : null,
        cardCount: cards.length,
      });
      bumpDailyRound(localDateString(new Date()));
      router.replace(href);
      return true;
    },
    [router, user, isMemberAccount],
  );
}

/** The next action an end-of-session screen offers inside a chain. */
export interface ChainHandoff {
  label: string;
  onNext: () => void;
  /** Leave mid-chain. The finish screens cover the app's own back controls. */
  onStop: () => void;
  final: boolean;
}

/** What a leg page needs to render chain chrome and hand off to the next leg. */
export interface ActiveChain {
  state: PracticeChainState;
  legs: ChainLeg[];
  index: number;
  leg: ChainLeg;
  /** Cards this leg plays; undefined means the whole deck. */
  cardIds: string[] | undefined;
  /** 'finish' once an assignment quest's goal leg is over. */
  phase: 'play' | 'finish';
  /** Bumped by `retry` so the page can remount the mode for a fresh session. */
  attempt: number;
  /**
   * The one button the end-of-session screen shows instead of its exit. Null on
   * the last leg of a mixed chain — there the ordinary "Back to Deck" is right.
   */
  handoff: ChainHandoff | null;
  /** Leave the chain — header back, quit, or a mode that can't run. */
  abandon: () => void;
  /** Re-run an assignment's goal leg after a near miss. */
  retry: () => void;
  goHome: () => void;
}

/**
 * The chain as seen from one leg's route. Null whenever this page isn't a live
 * leg — no URL marker, no stored chain, another deck, or a stored step that
 * doesn't match the mode rendered here — and then the page behaves exactly as
 * it did before chains existed.
 */
export function usePracticeChain({
  deckId,
  mode,
}: {
  /** Null on the cross-deck Review page, which belongs to no deck. */
  deckId: string | null;
  mode: GoalMode;
}): ActiveChain | null {
  const t = useTranslations('AssignmentQuest');
  const tModes = useTranslations('Deck.practiceModes');
  const tHero = useTranslations('Deck.practiceHero');
  const router = useRouter();
  const searchParams = useSearchParams();
  const marked = searchParams?.get(CHAIN_PARAM);
  const { awardFriendship } = useBuddyFriendshipCtx();

  const [state, setState] = useState<PracticeChainState | null>(null);
  const [phase, setPhase] = useState<'play' | 'finish'>('play');
  const [attempt, setAttempt] = useState(0);

  // sessionStorage is client-only, so the chain resolves after mount — the leg
  // pages are still loading cards then, so nothing visibly waits on it.
  useEffect(() => {
    if (!marked) {
      setState(null);
      return;
    }
    const stored = readChainState();
    const wrongDeck = stored?.kind !== 'daily' && stored?.deckId !== deckId;
    if (!stored || wrongDeck || stored.kind !== marked) {
      if (stored) clearChainState();
      setState(null);
      return;
    }
    setState(stored);
  }, [marked, deckId]);

  // A quest re-derives its plan on every leg, so deck size is resolved once and
  // written back — a later leg must not renumber the steps. An unreadable deck
  // is a dead quest: drop it and leave the plain page.
  useEffect(() => {
    if (!state || state.kind !== 'assignment' || state.cardCount !== null) return;
    let cancelled = false;
    void dbDeckCardCount(state.deckId).then((count) => {
      if (cancelled) return;
      if (count === null) {
        clearChainState();
        setState(null);
        return;
      }
      const next = { ...state, cardCount: count };
      writeChainState(next);
      setState(next);
    });
    return () => {
      cancelled = true;
    };
  }, [state]);

  const legs = useMemo(() => {
    if (!state) return [];
    if (state.kind !== 'assignment') return state.legs ?? [];
    return state.cardCount === null
      ? []
      : planAssignmentQuest({ cardCount: state.cardCount, requiredMode: state.requiredMode });
  }, [state]);

  const leg = state ? legs[state.index] : undefined;
  // A stored step that doesn't match this page means the learner navigated by
  // hand — end the chain quietly. Advancing creates that same mismatch for the
  // instant before the next route takes over, so it is exempt: clearing there
  // would wipe the chain the page we're navigating to is about to read.
  const advancingRef = useRef(false);
  const legDeck = leg?.deckId ?? state?.deckId;
  const matches = !!leg && leg.mode === mode && (mode === 'review' || legDeck === deckId);
  useEffect(() => {
    // Page and stored leg agreeing again means the hand-off landed, so the
    // exemption ends — left set it would swallow every later mismatch.
    if (matches) {
      advancingRef.current = false;
      return;
    }
    if (advancingRef.current) return;
    if (state && legs.length > 0) clearChainState();
  }, [state, legs, matches]);

  // Every mode's in-session quit also ends the session, so the signal alone
  // can't tell a finished leg from a bailed one; only the Finish button pays.
  const lastEndRef = useRef(0);
  useEffect(
    () =>
      onSessionEnd((signal) => {
        lastEndRef.current = signal.cardsStudied;
      }),
    [],
  );

  const stop = useCallback(() => {
    clearChainState();
    setState(null);
  }, []);

  const exitHref = state?.kind === 'daily' || deckId === null ? '/review' : `/deck/${deckId}`;
  const abandon = useCallback(() => {
    stop();
    router.push(exitHref);
  }, [stop, router, exitHref]);

  // Daily only: a Binder mini-lesson must not satisfy "today's practice".
  const finishDaily = useCallback(() => {
    if (state?.kind === 'daily' && isMeaningfulSession(lastEndRef.current)) {
      void awardFriendship('adventure').catch(() => {});
    }
    stop();
    router.push('/');
  }, [state?.kind, awardFriendship, stop, router]);

  const goHome = useCallback(() => {
    stop();
    router.push('/');
  }, [stop, router]);

  const advance = useCallback(() => {
    if (!state) return;
    const nextIndex = state.index + 1;
    const nextLeg = legs[nextIndex];
    const href = nextLeg ? chainLegHref(state.deckId, nextLeg, state.kind) : null;
    if (!href) {
      abandon();
      return;
    }
    advancingRef.current = true;
    const next = { ...state, index: nextIndex };
    writeChainState(next);
    setState(next);
    router.replace(href);
  }, [state, legs, router, abandon]);

  const retry = useCallback(() => {
    setPhase('play');
    setAttempt((a) => a + 1);
  }, []);

  if (!state || !leg || !matches) return null;

  const nextLeg = legs[state.index + 1];
  // A quest names the next leg by its role; a mixed session names the game,
  // since nobody picked it and the label is the only warning of what's coming.
  const nextLabel = nextLeg
    ? state.kind === 'assignment' || nextLeg.mode === 'review'
      ? t(`stepName.${nextLeg.step}`)
      : modeLabel(nextLeg.mode, tModes, tHero)
    : null;
  const handoff: ChainHandoff | null = nextLabel
    ? { label: t('nextStep', { step: nextLabel }), onNext: advance, onStop: abandon, final: false }
    : state.assignmentId
      ? {
          label: t('seeHowYouDid'),
          onNext: () => setPhase('finish'),
          onStop: abandon,
          final: true,
        }
      : state.kind === 'daily'
        ? { label: t('finishPractice'), onNext: finishDaily, onStop: abandon, final: true }
        : null;

  return {
    state,
    legs,
    index: state.index,
    leg,
    cardIds: leg.cardIds ?? state.cardIds ?? undefined,
    phase,
    attempt,
    handoff,
    abandon,
    retry,
    goHome,
  };
}

type Translate = (key: string) => string;

function modeLabel(mode: GoalMode, tModes: Translate, tHero: Translate): string {
  if (mode === 'study') return tHero('flashcardsTitle');
  const tile = PRACTICE_CONFIG.find((t) => t.mode === mode);
  return tile ? tModes(tile.labelKey) : mode;
}
