'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { alpha, useTheme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';

import { FriendshipMeter } from '@/components/FriendshipMeter';
import { StyledDialog } from '@/components/StyledDialog';
import type { BuddyStoryRequest } from '@/contexts/BuddyFriendshipContext';
import { useBuddyFriendshipCtx } from '@/contexts/BuddyFriendshipContext';
import { storyLines } from '@/lib/buddyPhrases';
import { friendshipLevel } from '@/lib/friendship';
import { unlockedFacts } from '@/lib/friendshipMilestones';

import { AboutBuddy } from './AboutBuddy';
import { BuddyArt } from './BuddyArt';
import { FriendshipDailyGoals } from './FriendshipDailyGoals';
import { FriendshipHeader } from './FriendshipHeader';
import { MemoryList } from './MemoryList';
import { NextMilestoneCallout } from './NextMilestoneCallout';
import { StoryReveal } from './StoryReveal';

const TITLE_ID = 'buddy-friendship-title';

export function BuddyFriendshipDialog() {
  const t = useTranslations('Home.buddy.friendship');
  const tItems = useTranslations('Shop.items');
  const tBuddies = useTranslations('Shop.buddies');
  const { brand } = useTheme().palette;
  const { storyRequest, closeStories, friendships } = useBuddyFriendshipCtx();

  // Rendering straight off storyRequest flickers to an empty level-1 body for
  // the whole exit transition — it is cleared the moment closing starts.
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
  const lines = isLevelUp ? storyLines(copy, level) : [];

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
        <Button onClick={closeStories} variant="contained" size="small">
          {t('close')}
        </Button>
      }
      actionsJustify="center"
    >
      <Box
        key={`${shown?.mode}-${buddyKey}-${level}`}
        sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.75 }}
      >
        {isLevelUp ? (
          <>
            <BuddyArt buddyKey={buddyKey} size={132} />
            <FriendshipMeter points={points} />
            {lines.length > 0 && (
              <Box
                sx={{ width: '100%', borderTop: `1px solid ${alpha(brand[300], 0.35)}`, pt: 1.75 }}
              >
                <StoryReveal lines={lines} />
              </Box>
            )}
          </>
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
