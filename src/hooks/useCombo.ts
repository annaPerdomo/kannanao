'use client';

import { useCallback, useRef, useState } from 'react';

import { useXpAnimation } from '@/contexts/XpAnimationContext';
import { type ComboState, comboStep, type ComboStepResult, INITIAL_COMBO } from '@/lib/combo';

/**
 * The combo meter for a single study run. Owns the run state, and when a
 * threshold is crossed awards the flat bonus + fires the XP count-up animation.
 *
 * IMPORTANT — pass in `addBonusXp` from the SAME `useProgress()` instance that
 * records the answers. Both do read-modify-write on `total_xp`; sharing one
 * instance means they build on the same in-memory `progressRef` and accumulate
 * instead of clobbering each other. A fresh `useProgress()` inside this hook
 * would hold its own snapshot and silently drop XP on every combo threshold.
 *
 * `triggerXpEarned` comes from the app-level XP animation context (a singleton),
 * so calling it here is safe.
 */
export function useCombo(addBonusXp: (amount: number) => void | Promise<void>) {
  const { triggerXpEarned } = useXpAnimation();
  const stateRef = useRef<ComboState>(INITIAL_COMBO);
  const [count, setCount] = useState(0);

  const onAnswer = useCallback(
    (correct: boolean): ComboStepResult => {
      const res = comboStep(stateRef.current, correct);
      stateRef.current = { count: res.count };
      setCount(res.count);
      if (res.bonusAwarded > 0) {
        // Flat award only — never a multiplier (XP is the shop currency).
        void addBonusXp(res.bonusAwarded);
        triggerXpEarned(res.bonusAwarded);
      }
      return res;
    },
    [addBonusXp, triggerXpEarned],
  );

  const reset = useCallback(() => {
    stateRef.current = INITIAL_COMBO;
    setCount(0);
  }, []);

  return { count, onAnswer, reset };
}
