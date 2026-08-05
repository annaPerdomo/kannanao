import { useCallback, useMemo, useRef, useState } from 'react';

import type { Flashcard } from '@/types/flashcard';

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export type QueuePhase = 'playing' | 'roundEnd' | 'allDone';

const MAX_RETRIES = 3;
/** Mastered cards mixed into every round after the first: a round runs this much
 * bigger than the batch asked for, which callers sizing a board must budget for. */
export const REVIEW_MIX = 2;

/**
 * Manages card batching with retry logic for practice modes.
 *
 * Cards are split into batches of `batchSize`. After each batch, incorrectly
 * answered cards are re-queued as a retry round (up to 3 retries). A few
 * mastered cards are mixed into each new round as review.
 */
export function usePracticeQueue(cards: Flashcard[], batchSize: number) {
  const allCards = useMemo(() => shuffle(cards), [cards]);

  const batches = useMemo(() => {
    const r: Flashcard[][] = [];
    for (let i = 0; i < allCards.length; i += batchSize) {
      r.push(allCards.slice(i, i + batchSize));
    }
    return r;
  }, [allCards, batchSize]);

  const [batchIndex, setBatchIndex] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [currentCards, setCurrentCards] = useState<Flashcard[]>(() => batches[0] ?? []);
  const [phase, setPhase] = useState<QueuePhase>('playing');
  const [roundKey, setRoundKey] = useState(0);
  const [lastRoundWrong, setLastRoundWrong] = useState(0);
  const [lastRoundTotal, setLastRoundTotal] = useState(0);

  // Per-round results — false is sticky (once wrong, stays wrong for retry)
  const results = useRef<Map<string, boolean>>(new Map());
  // All mastered card IDs (eventually answered correctly)
  const masteredIds = useRef<Set<string>>(new Set());
  // First-ever attempt per card (for final celebration stats)
  const firstAttempts = useRef<Map<string, boolean>>(new Map());

  const reportResult = useCallback((cardId: string, correct: boolean) => {
    // Per-round tracking: false is sticky
    if (!correct) {
      results.current.set(cardId, false);
    } else if (results.current.get(cardId) !== false) {
      results.current.set(cardId, true);
    }
    // First-attempt tracking: only the very first answer per card
    if (!firstAttempts.current.has(cardId)) {
      firstAttempts.current.set(cardId, correct);
    }
  }, []);

  const finishRound = useCallback(() => {
    const wrong: Flashcard[] = [];
    for (const card of currentCards) {
      if (results.current.get(card.id) === true) {
        masteredIds.current.add(card.id);
      } else {
        wrong.push(card);
      }
    }

    setLastRoundWrong(wrong.length);
    setLastRoundTotal(currentCards.length);

    if (wrong.length > 0 && retryCount < MAX_RETRIES) {
      setPhase('roundEnd');
    } else if (batchIndex >= batches.length - 1) {
      setPhase('allDone');
    } else {
      setPhase('roundEnd');
    }
  }, [currentCards, retryCount, batchIndex, batches.length]);

  const nextRound = useCallback(() => {
    const wrong = currentCards.filter((c) => results.current.get(c.id) !== true);
    results.current = new Map();

    if (wrong.length > 0 && retryCount < MAX_RETRIES) {
      // Retry wrong cards + mix in review from mastered pool
      const reviewPool = allCards.filter(
        (c) => masteredIds.current.has(c.id) && !wrong.find((w) => w.id === c.id),
      );
      const review = shuffle(reviewPool).slice(0, Math.min(REVIEW_MIX, reviewPool.length));
      setCurrentCards(shuffle([...wrong, ...review]));
      setRetryCount((r) => r + 1);
    } else {
      // Advance to next batch
      const next = batchIndex + 1;
      if (next < batches.length) {
        const reviewPool = allCards.filter(
          (c) => masteredIds.current.has(c.id) && !batches[next].find((b) => b.id === c.id),
        );
        const review = shuffle(reviewPool).slice(0, Math.min(REVIEW_MIX, reviewPool.length));
        setCurrentCards(shuffle([...batches[next], ...review]));
        setBatchIndex(next);
        setRetryCount(0);
      }
    }

    setRoundKey((k) => k + 1);
    setPhase('playing');
  }, [currentCards, retryCount, batchIndex, batches, allCards]);

  const willRetry = lastRoundWrong > 0 && retryCount < MAX_RETRIES;

  // First-attempt stats computed once when practice completes
  const firstAttemptCorrect = useMemo(() => {
    if (phase !== 'allDone') return 0;
    return [...firstAttempts.current.values()].filter(Boolean).length;
  }, [phase]);

  return {
    currentCards,
    phase,
    batchIndex,
    totalBatches: batches.length,
    isRetryRound: retryCount > 0,
    retryCount,
    lastRoundWrong,
    lastRoundTotal,
    willRetry,
    roundKey,
    reportResult,
    finishRound,
    nextRound,
    totalCards: allCards.length,
    firstAttemptCorrect,
  };
}
