'use client';

import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import { FriendshipMeter } from '@/components/FriendshipMeter';
import { clampPoints, friendshipLevel, friendshipProgress } from '@/lib/friendship';
import { allMilestones } from '@/lib/friendshipMilestones';

import { BuddyArt } from './BuddyArt';

interface FriendshipHeaderProps {
  buddyKey: string;
  name: string;
  points: number;
}

/** Milestones inside the current level, as 0..1 fractions of the meter's track. */
function levelTicks(points: number): number[] {
  const progress = friendshipProgress(points);
  if (!progress) return [];
  const floor = clampPoints(points) - progress.current;
  return allMilestones()
    .filter(({ atPoints }) => atPoints > floor && atPoints < floor + progress.needed)
    .map(({ atPoints }) => (atPoints - floor) / progress.needed);
}

export function FriendshipHeader({ buddyKey, name, points }: FriendshipHeaderProps) {
  const t = useTranslations('Home.buddy.friendship');
  const { brand } = useTheme().palette;
  const level = friendshipLevel(points);

  return (
    <Box
      sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}
    >
      <BuddyArt buddyKey={buddyKey} size={92} />

      <Box sx={{ textAlign: 'center' }}>
        <Typography
          sx={{
            fontSize: '0.68rem',
            fontWeight: 800,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: alpha(brand[700], 0.65),
          }}
        >
          {name}
        </Typography>
        <Typography sx={{ fontSize: '1.05rem', fontWeight: 900, color: brand[800] }}>
          {t(`levelNames.${level}`)}
        </Typography>
        <Typography sx={{ fontSize: '0.85rem', lineHeight: 1.5, color: 'text.primary', mt: 0.25 }}>
          {t(`levelTone.${level}`, { name })}
        </Typography>
      </Box>

      <Box sx={{ width: '100%' }}>
        <FriendshipMeter points={points} ticks={levelTicks(points)} />
      </Box>
    </Box>
  );
}
