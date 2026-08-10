'use client';

import FavoriteIcon from '@mui/icons-material/Favorite';
import ButtonBase from '@mui/material/ButtonBase';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { useBuddyFriendshipCtx } from '@/contexts/BuddyFriendshipContext';

import { chipPop } from './animations';

interface FriendshipHeartsProps {
  isDragging: boolean;
  buddyKey: string;
}

/**
 * Re-keyed on the total so an award pops it. Every pointer/key event stops
 * here: the buddy behind it drags and pets on the same gestures.
 */
export function FriendshipHearts({ isDragging, buddyKey }: FriendshipHeartsProps) {
  const t = useTranslations('Home.buddy.friendship');
  const tItems = useTranslations('Shop.items');
  const theme = useTheme();
  const { brand } = theme.palette;
  const { equipped, loadState, openStories } = useBuddyFriendshipCtx();
  const points = equipped?.points ?? 0;

  const stop = useCallback((e: React.SyntheticEvent) => e.stopPropagation(), []);
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      openStories(buddyKey);
    },
    [buddyKey, openStories],
  );

  // Nothing, not 0, until the rows land: a chip that pops from 0 to the real
  // total on every page load reads as "I lost my hearts".
  if (loadState !== 'loaded') return null;

  return (
    <ButtonBase
      key={points}
      aria-label={t('storiesAria', { name: tItems(`${buddyKey}.name`), count: points })}
      onClick={handleClick}
      onPointerDown={stop}
      onPointerUp={stop}
      onKeyDown={stop}
      sx={{
        position: 'absolute',
        top: -4,
        right: -14,
        zIndex: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 0.25,
        px: 0.75,
        py: 0.1,
        borderRadius: 99,
        bgcolor: alpha('#fff', 0.92),
        border: `1.5px solid ${alpha(brand[300], 0.5)}`,
        boxShadow: `0 2px 8px ${alpha(brand[400], 0.18)}`,
        animation: `${chipPop} 0.35s ease-out`,
        // Mid-drag the chip would swallow the gesture that moves the buddy.
        pointerEvents: isDragging ? 'none' : 'auto',
        opacity: isDragging ? 0.6 : 1,
      }}
    >
      <FavoriteIcon sx={{ fontSize: 11, color: brand[400] }} aria-hidden />
      <Typography sx={{ fontSize: '0.68rem', fontWeight: 800, color: brand[700], lineHeight: 1 }}>
        {points}
      </Typography>
    </ButtonBase>
  );
}
