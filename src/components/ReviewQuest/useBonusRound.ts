'use client';

import { useCallback, useState } from 'react';

import { useBuddyFriendshipCtx } from '@/contexts/BuddyFriendshipContext';
import { useXpAnimation } from '@/contexts/XpAnimationContext';
import { BONUS_XP, bonusRoundsToday, MAX_BONUS_ROUNDS, recordBonusRound } from '@/lib/bonusRound';
import { localDateString } from '@/lib/chest';

export interface UseBonusRoundArgs {
  addBonusXp: (amount: number) => Promise<void> | void;
}

/**
 * Re-checks the daily cap here too, not just at the launching button, so a
 * back-navigated or replayed bonus URL can't pay past it.
 */
export function useBonusRound({ addBonusXp }: UseBonusRoundArgs) {
  const { triggerXpEarned } = useXpAnimation();
  const { awardFriendship } = useBuddyFriendshipCtx();
  const [rewarded, setRewarded] = useState(false);
  const [rescuedCount, setRescuedCount] = useState(0);
  const [heartsEarned, setHeartsEarned] = useState(0);

  const finish = useCallback(
    (studied: number, rescued: number) => {
      const today = localDateString(new Date());
      if (studied < 5 || bonusRoundsToday(today) >= MAX_BONUS_ROUNDS) return;
      recordBonusRound(today);
      setRewarded(true);
      setRescuedCount(rescued);
      void Promise.resolve(addBonusXp(BONUS_XP)).then(() => triggerXpEarned(BONUS_XP));
      void awardFriendship('bonus')
        .then((award) => setHeartsEarned(award?.awarded ?? 0))
        .catch(() => {});
    },
    [addBonusXp, triggerXpEarned, awardFriendship],
  );

  return { rewarded, rescuedCount, heartsEarned, finish };
}
