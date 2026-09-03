'use client';

import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import FavoriteIcon from '@mui/icons-material/Favorite';
import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import { nextPromisedMilestone } from '@/lib/friendshipMilestones';

type FriendshipTranslate = (key: string, values?: Record<string, string | number>) => string;

export function milestoneMessage(
  t: FriendshipTranslate,
  copy: unknown,
  name: string,
  points: number,
): string {
  const promised = nextPromisedMilestone(copy, points);
  if (!promised) return t('milestone.max', { name });
  if (!promised.authored) {
    return t('milestone.level', {
      count: promised.heartsAway,
      name,
      levelName: t(`levelNames.${promised.milestone.level}`),
    });
  }
  return promised.milestone.kind === 'memory'
    ? t('milestone.memory', { count: promised.heartsAway, name })
    : t('milestone.fact', { count: promised.heartsAway, name });
}

interface NextMilestoneCalloutProps {
  copy: unknown;
  name: string;
  points: number;
}

export function NextMilestoneCallout({ copy, name, points }: NextMilestoneCalloutProps) {
  const t = useTranslations('Home.buddy.friendship');
  const { brand } = useTheme().palette;

  const promised = nextPromisedMilestone(copy, points);
  const message = milestoneMessage(t, copy, name, points);

  return (
    <Box
      sx={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 1.75,
        py: 1.25,
        borderRadius: 3,
        bgcolor: alpha(brand[100], 0.55),
        border: `1.5px solid ${alpha(brand[300], 0.45)}`,
      }}
    >
      {promised ? (
        <FavoriteIcon sx={{ fontSize: 18, color: brand[400], flexShrink: 0 }} aria-hidden />
      ) : (
        <AutoAwesomeIcon sx={{ fontSize: 18, color: brand[400], flexShrink: 0 }} aria-hidden />
      )}
      <Typography sx={{ fontSize: '0.88rem', fontWeight: 700, color: 'text.primary' }}>
        {message}
      </Typography>
    </Box>
  );
}
