'use client';

import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

import { useBuddyFriendshipCtx } from '@/contexts/BuddyFriendshipContext';
import { useProgressCtx } from '@/contexts/ProgressContext';
import { useShopCtx } from '@/contexts/ShopContext';
import { useDueCount } from '@/hooks/useDueCount';
import { buddyFaceSrc, resolveBuddyKey } from '@/lib/buddies';
import { localDateString } from '@/lib/chest';
import { FRIENDSHIP_POINTS } from '@/lib/friendship';
import { isReturningAfterBreak } from '@/lib/studyWeek';

import { CompletedState, DueState, NothingDueState } from './AdventureStates';
import { nearMilestoneHook } from './nearMilestone';
import { WeekDots } from './WeekDots';

/** Fixed, not randomFaceVariant() — the hero re-renders and the face would flip. */
const FACE_DEFAULT = 1;
const FACE_CELEBRATE = 2;

type AdventureState = 'completed' | 'due' | 'nothingDue';

/**
 * The day's one mission, in the home hero rather than the dashboard grid: grid
 * sections are hideable, and resolveGridLayout appends new ones to the BOTTOM of
 * every existing user's saved layout.
 *
 * Reads only what the app already holds client-side, and writes nothing — no
 * streak, no achievement, no fetch of its own.
 */
export function TodayAdventureCard() {
  const router = useRouter();
  const t = useTranslations('Home.adventure');
  const tItems = useTranslations('Shop.items');
  const tFriendship = useTranslations('Home.buddy.friendship');
  const tBuddies = useTranslations('Shop.buddies');

  const { dueCount, loading: dueLoading, error: dueError } = useDueCount();
  const { progress, recentSessions, loading: progressLoading } = useProgressCtx();
  const {
    friendships,
    equipped,
    todayGoals,
    loadState: friendshipLoad,
    ensureLoaded,
  } = useBuddyFriendshipCtx();
  const { equipped: shopEquipped } = useShopCtx();

  // The provider doesn't fetch friendships on mount, and an unloaded `friendships`
  // is indistinguishable from "no row yet" — hold the skeleton rather than fall
  // through to the chest fallback on a false negative.
  useEffect(() => {
    void ensureLoaded();
  }, [ensureLoaded]);

  // 'error' releases the gate too — the chest fallback below beats a skeleton
  // that never resolves.
  const friendshipSettled = friendshipLoad === 'loaded' || friendshipLoad === 'error';

  if (dueLoading || progressLoading || !friendshipSettled) {
    return (
      <Skeleton
        variant="rounded"
        // A rounded Skeleton with no height and no children collapses to ~18px,
        // and the hero jumps when the card lands.
        height={300}
        sx={{
          maxWidth: { sm: 340 },
          borderRadius: (theme) => theme.radii.md,
          bgcolor: alpha('#fff', 0.18),
        }}
      />
    );
  }

  // Local dates during render are safe only because the gate above holds until
  // client data lands — the server never reaches a date-dependent branch.
  const now = new Date();
  const today = localDateString(now);
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = localDateString(yesterdayDate);

  const buddyKey = resolveBuddyKey(shopEquipped['study_buddy']);
  const buddyName = tItems(`${buddyKey}.name`);

  // Every buddy row, not the equipped one: the cap is per user, so adventuring
  // with Tsuki and then equipping Momiji must not reopen the day. Users from
  // before the friendship feature have no row at all, so the daily chest — which
  // only opens on a cleared queue — stands in, over-reporting slightly until
  // they earn their first heart.
  const hasFriendship = friendshipLoad === 'loaded' && Object.keys(friendships).length > 0;
  const adventuredRow = hasFriendship
    ? Object.values(friendships).find((f) => f.lastAdventureDate === today)
    : undefined;
  const completedToday = hasFriendship ? !!adventuredRow : progress?.last_chest_date === today;

  // The hearts went to whoever was equipped at adventure time. Naming today's
  // buddy would credit one whose total never moved.
  const creditedKey = adventuredRow ? resolveBuddyKey(adventuredRow.buddyKey) : buddyKey;

  // A failed count is not a count of zero — "no reviews waiting" off a network
  // error would be a lie. Completed doesn't read the count, so it still renders.
  if (!completedToday && dueError) return null;

  const state: AdventureState = completedToday ? 'completed' : dueCount > 0 ? 'due' : 'nothingDue';
  const returning =
    state !== 'completed' &&
    isReturningAfterBreak(progress?.last_study_date ?? null, today, yesterday);

  let friendshipCopy: unknown = null;
  try {
    friendshipCopy = tBuddies.raw(`${buddyKey}.friendship`);
  } catch {
    // buddy with no friendship copy — nearMilestoneHook then stays quiet
  }
  // Only when the rows really landed: 'error' leaves points at a fabricated 0,
  // which would promise the first milestone to someone who passed it long ago.
  const near =
    friendshipLoad === 'loaded'
      ? nearMilestoneHook(friendshipCopy, equipped?.points ?? 0, todayGoals ?? [], today)
      : null;
  const friendshipLine = near
    ? near.kind === 'memory'
      ? tFriendship('nearMilestone.memory', { name: buddyName })
      : tFriendship('nearMilestone.fact', { count: near.heartsAway, name: buddyName })
    : null;

  const start = () => router.push('/review/today');
  const playGame = () => router.push('/review');
  // Pointer convenience only, no role/tabIndex: a focusable button nested in a
  // role="button" makes its accessible name presentational. Start is the control.
  const clickable = state === 'due';

  return (
    <Box
      onClick={clickable ? start : undefined}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        // Shrink-wrapped from sm up, where the card sits on the hero artwork:
        // stretched to the column's cap it covers the mascot with nothing.
        width: { xs: '100%', sm: 'fit-content' },
        maxWidth: '100%',
        p: { xs: 1.75, sm: 1.75 },
        borderRadius: (theme) => theme.radii.md,
        // Sits on the hero artwork — a pale surface would vanish into the banner.
        bgcolor: alpha('#fff', 0.16),
        border: `1.5px solid ${alpha('#fff', 0.3)}`,
        backdropFilter: 'blur(4px)',
        cursor: clickable ? 'pointer' : 'default',
        transition: 'transform 0.15s ease, background-color 0.15s ease',
        ...(clickable && {
          '&:hover': { transform: 'translateY(-2px)', bgcolor: alpha('#fff', 0.22) },
        }),
      }}
    >
      {state === 'completed' && (
        <CompletedState
          buddyName={tItems(`${creditedKey}.name`)}
          faceSrc={buddyFaceSrc(creditedKey, FACE_CELEBRATE)}
          // The chest fallback proves a cleared queue, not a paid heart.
          hearts={hasFriendship ? FRIENDSHIP_POINTS.adventure : 0}
          onPlayGame={playGame}
        />
      )}
      {state === 'due' && (
        <DueState
          buddyName={buddyName}
          faceSrc={buddyFaceSrc(buddyKey, FACE_DEFAULT)}
          dueCount={dueCount}
          friendshipLine={friendshipLine}
          onStart={start}
          onPlayGame={playGame}
        />
      )}
      {state === 'nothingDue' && (
        <NothingDueState onPlayGame={playGame} onPracticeDeck={() => router.push('/decks')} />
      )}

      {returning && (
        <Typography variant="body2" sx={{ fontWeight: 700, color: alpha('#fff', 0.92) }}>
          {t('welcomeBack', { name: buddyName })}
        </Typography>
      )}

      <WeekDots sessions={recentSessions} today={today} />
    </Box>
  );
}
