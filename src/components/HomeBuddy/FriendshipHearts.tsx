'use client';

import FavoriteIcon from '@mui/icons-material/Favorite';
import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import { useBuddyFriendshipCtx } from '@/contexts/BuddyFriendshipContext';

import { chipPop } from './animations';

interface FriendshipHeartsProps {
  isDragging: boolean;
}

/**
 * Tiny hearts total pinned to the buddy's shoulder. Re-keyed on the value so
 * an award pops it.
 * TODO(prompt-05): becomes a button that opens the buddy story dialog once
 * openBuddyStories exists.
 */
export function FriendshipHearts({ isDragging }: FriendshipHeartsProps) {
  const t = useTranslations('Home.buddy.friendship');
  const theme = useTheme();
  const { brand } = theme.palette;
  const { equipped } = useBuddyFriendshipCtx();
  const points = equipped?.points ?? 0;

  return (
    <Box
      key={points}
      role="img"
      aria-label={t('heartsAria', { count: points })}
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
        pointerEvents: 'none',
        opacity: isDragging ? 0.6 : 1,
      }}
    >
      <FavoriteIcon sx={{ fontSize: 11, color: brand[400] }} aria-hidden />
      <Typography sx={{ fontSize: '0.68rem', fontWeight: 800, color: brand[700], lineHeight: 1 }}>
        {points}
      </Typography>
    </Box>
  );
}
