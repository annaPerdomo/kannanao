'use client';

import { useCallback, useEffect, useRef } from 'react';

import { useXpAnimation } from '@/contexts/XpAnimationContext';
import { useCombo } from '@/hooks/useCombo';
import { type SessionMode, useProgress, XP_PER_WRONG } from '@/hooks/useProgress';
import { cardXp } from '@/lib/flashcardUtils';
import type { JlptLevel } from '@/types/flashcard';

/**
 * Session + XP wiring shared by the review games. Starts a deckless
 * study session on mount, exposes `answer(correct, jlpt?, cardId?)` to record
 * each answer (with the XP pop animation) — and, when a cardId is passed, to
 * advance that card's SRS schedule — plus `finish()` / `quit()` to close it.
 *
 * Also carries the combo meter so all four review games get the combo chip and
 * its flat bonuses for free. `combo` shares this hook's `useProgress` instance
 * (via `addBonusXp`), so its bonus writes accumulate with the per-answer writes.
 */
export function useGameSession(mode: SessionMode) {
  const { startSession, recordAnswer, endSession, addBonusXp } = useProgress();
  const { triggerXpEarned } = useXpAnimation();
  const combo = useCombo(addBonusXp);

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
    async (correct: boolean, jlptLevel?: JlptLevel, cardId?: string) => {
      answeredRef.current += 1;
      if (correct) correctRef.current += 1;
      triggerXpEarned(correct ? cardXp(jlptLevel) : XP_PER_WRONG);
      if (sessionIdRef.current) {
        // Passing cardId advances that card's review schedule (card-based games
        // only). Grammar games call answer() without it — nothing to schedule.
        await recordAnswer(sessionIdRef.current, correct, jlptLevel, cardId);
      }
      // Advance the combo AFTER the answer is recorded so its bonus write lands
      // on the updated progress snapshot.
      combo.onAnswer(correct);
    },
    [recordAnswer, triggerXpEarned, combo],
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

  return { answer, finish, comboCount: combo.count };
}
