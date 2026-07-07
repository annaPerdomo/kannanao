'use client';

import { useCallback, useEffect, useRef } from 'react';

import { useXpAnimation } from '@/contexts/XpAnimationContext';
import { type SessionMode, useProgress, XP_PER_WRONG } from '@/hooks/useProgress';
import { cardXp } from '@/lib/flashcardUtils';
import type { JlptLevel } from '@/types/flashcard';

/**
 * Session + XP wiring shared by the review games. Starts a deckless
 * study session on mount, exposes `answer(correct)` to record each answer
 * (with the XP pop animation), and `finish()` / `quit()` to close the session.
 */
export function useGameSession(mode: SessionMode) {
  const { startSession, recordAnswer, endSession } = useProgress();
  const { triggerXpEarned } = useXpAnimation();

  const sessionIdRef = useRef<string>('');
  const startTimeRef = useRef<number>(Date.now());
  const answeredRef = useRef(0);
  const correctRef = useRef(0);
  const startedRef = useRef(false);

  useEffect(() => {
    // startSession's identity changes whenever progress updates; only the
    // first invocation should create a session row.
    if (startedRef.current) return;
    startedRef.current = true;
    startSession(null, mode).then((id) => {
      sessionIdRef.current = id;
      startTimeRef.current = Date.now();
    });
  }, [mode, startSession]);

  const answer = useCallback(
    async (correct: boolean, jlptLevel?: JlptLevel) => {
      answeredRef.current += 1;
      if (correct) correctRef.current += 1;
      triggerXpEarned(correct ? cardXp(jlptLevel) : XP_PER_WRONG);
      if (sessionIdRef.current) {
        await recordAnswer(sessionIdRef.current, correct, jlptLevel);
      }
    },
    [recordAnswer, triggerXpEarned],
  );

  const finish = useCallback(async () => {
    if (!sessionIdRef.current) return;
    const id = sessionIdRef.current;
    sessionIdRef.current = '';
    await endSession(id, {
      cardsStudied: answeredRef.current,
      cardsCorrect: correctRef.current,
      durationSecs: Math.round((Date.now() - startTimeRef.current) / 1000),
    });
  }, [endSession]);

  return { answer, finish };
}
