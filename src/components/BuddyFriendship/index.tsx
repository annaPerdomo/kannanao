'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef } from 'react';

import { StyledDialog } from '@/components/StyledDialog';
import type { BuddyStoryRequest } from '@/contexts/BuddyFriendshipContext';
import { useBuddyFriendshipCtx } from '@/contexts/BuddyFriendshipContext';
import { friendshipLevel } from '@/lib/friendship';
import { unlockedFacts } from '@/lib/friendshipMilestones';

import { AboutBuddy } from './AboutBuddy';
import { FriendshipDailyGoals } from './FriendshipDailyGoals';
import { FriendshipHeader } from './FriendshipHeader';
import { LevelUpSequence } from './LevelUpSequence';
import { MemoryList } from './MemoryList';
import { NextMilestoneCallout } from './NextMilestoneCallout';

export { milestoneMessage } from './NextMilestoneCallout';

const TITLE_ID = 'buddy-friendship-title';

export function BuddyFriendshipDialog() {
  const t = useTranslations('Home.buddy.friendship');
  const tItems = useTranslations('Shop.items');
  const tBuddies = useTranslations('Shop.buddies');
  const { storyRequest, closeStories, openStories, clearLevelUpEvent, friendships } =
    useBuddyFriendshipCtx();

  // storyRequest is cleared the moment closing starts, so rendering off it
  // flickers to an empty level-1 body for the whole exit transition.
  const lastRequest = useRef<BuddyStoryRequest | null>(null);
  useEffect(() => {
    if (storyRequest) lastRequest.current = storyRequest;
  }, [storyRequest]);
  const shown = storyRequest ?? lastRequest.current;

  const buddyKey = shown?.buddyKey ?? '';
  const points = friendships[buddyKey]?.points ?? 0;

  let copy: unknown = null;
  let name = '';
  if (shown) {
    try {
      copy = tBuddies.raw(`${buddyKey}.friendship`);
    } catch {
      // buddy without friendship copy yet — meter and locked rows still render
    }
    name = tItems(`${buddyKey}.name`);
  }

  const isLevelUp = shown?.mode === 'levelUp';
  const level = shown?.mode === 'levelUp' ? shown.level : friendshipLevel(points);

  // Switching to browse leaves closeStories nothing to consume; without this
  // drop the celebration pops again on the next route change.
  const browseMemories = useCallback(() => {
    clearLevelUpEvent();
    openStories(buddyKey);
  }, [clearLevelUpEvent, openStories, buddyKey]);

  return (
    <StyledDialog
      open={!!storyRequest}
      onClose={closeStories}
      titleId={TITLE_ID}
      title={
        isLevelUp
          ? t('levelUpTitle', { name, level: t(`levelNames.${level}`) })
          : t('friendshipTitle', { name })
      }
      actions={
        isLevelUp ? undefined : (
          <Button onClick={closeStories} variant="contained" size="small">
            {t('close')}
          </Button>
        )
      }
      actionsJustify="center"
    >
      <Box
        key={`${shown?.mode}-${buddyKey}-${level}`}
        sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.75 }}
      >
        {isLevelUp ? (
          <LevelUpSequence
            buddyKey={buddyKey}
            name={name}
            copy={copy}
            level={level}
            onBrowse={browseMemories}
            onClose={closeStories}
          />
        ) : (
          <>
            <FriendshipHeader buddyKey={buddyKey} name={name} points={points} />
            <NextMilestoneCallout copy={copy} name={name} points={points} />
            <FriendshipDailyGoals name={name} onLeave={closeStories} />
            <AboutBuddy name={name} facts={unlockedFacts(copy, points)} />
            <MemoryList copy={copy} level={level} />
          </>
        )}
      </Box>
    </StyledDialog>
  );
}
