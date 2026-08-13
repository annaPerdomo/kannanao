'use client';

import FavoriteIcon from '@mui/icons-material/Favorite';
import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import { friendshipLevel, friendshipProgress } from '@/lib/friendship';

interface FriendshipMeterProps {
  points: number;
  size?: 'small' | 'medium';
  /** Marks along the track, as 0..1 fractions of the current level's width. */
  ticks?: number[];
}

export function FriendshipMeter({ points, size = 'medium', ticks }: FriendshipMeterProps) {
  const t = useTranslations('Home.buddy.friendship');
  const theme = useTheme();
  const { brand } = theme.palette;

  const level = friendshipLevel(points);
  const progress = friendshipProgress(points);
  const levelName = t(`levelNames.${level}`);
  const ariaLabel = progress
    ? t('meterAria', { levelName, current: progress.current, needed: progress.needed })
    : t('meterAriaMax', { levelName });

  const compact = size === 'small';

  return (
    <Box
      role="img"
      aria-label={ariaLabel}
      sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: compact ? 140 : 180 }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <FavoriteIcon sx={{ fontSize: compact ? 14 : 18, color: brand[400] }} />
          <Typography
            sx={{
              fontSize: compact ? '0.75rem' : '0.85rem',
              fontWeight: 700,
              color: 'text.primary',
            }}
          >
            {levelName}
          </Typography>
        </Box>
        {progress && !compact && (
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
            {progress.current} / {progress.needed}
          </Typography>
        )}
      </Box>
      <Box sx={{ position: 'relative' }}>
        <LinearProgress
          variant="determinate"
          value={progress ? Math.min(100, (progress.current / progress.needed) * 100) : 100}
          aria-hidden
          sx={{
            height: compact ? 5 : 7,
            borderRadius: 99,
            bgcolor: alpha(brand[300], 0.25),
            '& .MuiLinearProgress-bar': { bgcolor: brand[400], borderRadius: 99 },
          }}
        />
        {ticks?.map((fraction) => (
          <Box
            key={fraction}
            aria-hidden
            sx={{
              position: 'absolute',
              top: 1,
              bottom: 1,
              left: `${Math.min(100, Math.max(0, fraction * 100))}%`,
              transform: 'translateX(-50%)',
              width: 2,
              borderRadius: 99,
              bgcolor: alpha(brand[700], 0.35),
            }}
          />
        ))}
      </Box>
    </Box>
  );
}
