'use client';

import Box from '@mui/material/Box';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

import { Loading } from '@/components/Loading';
import { DoneBody } from '@/components/PracticeDone';
import { useBuddyFriendshipCtx } from '@/contexts/BuddyFriendshipContext';
import { useShopCtx } from '@/contexts/ShopContext';
import { useDueCount } from '@/hooks/useDueCount';
import { bonusRoundsToday, MAX_BONUS_ROUNDS } from '@/lib/bonusRound';
import { buddyFaceSrc, resolveBuddyKey } from '@/lib/buddies';
import { localDateString } from '@/lib/chest';
import { LAYOUT } from '@/theme';

/** Not part of the practice chain — a bonus round is launched by URL and reports back here directly. */
export default function PracticeDonePage() {
  const t = useTranslations('PracticeDone.done');
  const tItems = useTranslations('Shop.items');
  const router = useRouter();
  const { dueCount, loading, error } = useDueCount();
  const { stamps, loadState, ensureLoaded } = useBuddyFriendshipCtx();
  const { equipped: shopEquipped } = useShopCtx();

  useEffect(() => {
    void ensureLoaded();
  }, [ensureLoaded]);

  const buddyKey = resolveBuddyKey(shopEquipped['study_buddy']);
  const buddyName = tItems(`${buddyKey}.name`);
  const today = localDateString(new Date());

  const friendshipSettled = loadState === 'loaded' || loadState === 'error';
  if (loading || !friendshipSettled) {
    return (
      <Box sx={{ maxWidth: LAYOUT.narrowMaxWidth, mx: 'auto', px: LAYOUT.pagePx, py: 8 }}>
        <Loading message={t('heading')} />
      </Box>
    );
  }

  // A failed count reads as "nothing due" here on purpose: the bonus offer is
  // a nice-to-have, never worth blocking the done screen on a retry.
  const effectiveDueCount = error ? 0 : dueCount;
  const offerBonus = effectiveDueCount > 0 && bonusRoundsToday(today) < MAX_BONUS_ROUNDS;
  const showBonusHearts = stamps.bonus !== today;

  return (
    <Box sx={{ maxWidth: LAYOUT.narrowMaxWidth, mx: 'auto', px: LAYOUT.pagePx, py: 8 }}>
      <DoneBody
        buddyName={buddyName}
        faceSrc={buddyFaceSrc(buddyKey, 1)}
        dueCount={effectiveDueCount}
        offerBonus={offerBonus}
        showBonusHearts={showBonusHearts}
        onBonus={() => router.push('/review/today?daily=1&bonus=1')}
        onMorePractice={() => router.push('/review/start')}
        onFinish={() => router.push('/')}
      />
    </Box>
  );
}
