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
import { BUDDY_ART, buddyShopSrc } from '@/lib/buddies';
import { storyLines } from '@/lib/buddyPhrases';
import { friendshipLevel } from '@/lib/friendship';

import { StoryList } from './StoryList';
import { StoryReveal } from './StoryReveal';

const TITLE_ID = 'buddy-story-title';

/**
 * Level-up celebration and re-readable story list. Mounted once next to the
 * global buddy; opened from the hearts chip or by a released level-up.
 */
export function BuddyStoryDialog() {
  const t = useTranslations('Home.buddy.friendship');
  const tItems = useTranslations('Shop.items');
  const tBuddies = useTranslations('Shop.buddies');
  const { brand } = useTheme().palette;
  const { storyRequest, closeStories, friendships } = useBuddyFriendshipCtx();

  // The request is cleared the moment the dialog starts closing, so the body
  // renders from the last one — otherwise it flickers to an empty level-1
  // state for the length of the exit transition.
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
  // The celebration is about the level just crossed; browsing is about where
  // the buddy stands now, which a heart earned since then may have moved.
  const level = shown?.mode === 'levelUp' ? shown.level : friendshipLevel(points);
  const lines = isLevelUp ? storyLines(copy, level) : [];
  const art = BUDDY_ART[buddyKey];

  return (
    <StyledDialog
      open={!!storyRequest}
      onClose={closeStories}
      titleId={TITLE_ID}
      title={
        isLevelUp
          ? t('levelUpTitle', { name, level: t(`levelNames.${level}`) })
          : t('storiesTitle', { name })
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
        {art && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              width: '100%',
              py: 1,
              borderRadius: 3,
              background: `radial-gradient(ellipse at 50% 100%, ${alpha(art.accent, 0.22)} 0%, ${alpha(art.bg, 0.6)} 70%)`,
            }}
          >
            <Box
              component="img"
              src={buddyShopSrc(buddyKey)}
              alt=""
              sx={{ width: isLevelUp ? 132 : 92, height: 'auto', objectFit: 'contain' }}
            />
          </Box>
        )}

        <FriendshipMeter points={points} />

        {(isLevelUp ? lines.length > 0 : true) && (
          <Box sx={{ width: '100%', borderTop: `1px solid ${alpha(brand[300], 0.35)}`, pt: 1.75 }}>
            {isLevelUp ? <StoryReveal lines={lines} /> : <StoryList copy={copy} level={level} />}
          </Box>
        )}
      </Box>
    </StyledDialog>
  );
}
