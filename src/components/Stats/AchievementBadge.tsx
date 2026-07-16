'use client';

import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useLocale, useTranslations } from 'next-intl';

import { ACHIEVEMENTS, achievementSlug } from '@/hooks/useProgress';

export function AchievementBadge({
  achievementKey,
  unlocked,
  unlockedAt,
}: {
  achievementKey: string;
  unlocked: boolean;
  unlockedAt?: string;
}) {
  const t = useTranslations('Review.achievements');
  const tStats = useTranslations('Stats.achievementBadge');
  const locale = useLocale();
  const def = ACHIEVEMENTS.find((a) => a.key === achievementKey);
  if (!def) return null;

  const slug = achievementSlug(def.key);
  const label = t(`${slug}.label`);
  const description = t(`${slug}.description`);

  const badge = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.75,
        p: 1.5,
        width: 100,
        opacity: unlocked ? 1 : 0.35,
        filter: unlocked ? 'none' : 'grayscale(100%)',
        transition: 'all 0.2s',
        cursor: unlocked ? 'default' : 'not-allowed',
      }}
    >
      <Box
        sx={{
          width: 54,
          height: 54,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.7rem',
          background: unlocked ? `${def.color}20` : 'rgba(0,0,0,0.06)',
          border: `2px solid ${unlocked ? def.color + '60' : 'transparent'}`,
          boxShadow: unlocked ? `0 0 12px ${def.color}30` : 'none',
        }}
      >
        {unlocked ? def.emoji : '🔒'}
      </Box>
      <Typography
        sx={{
          fontSize: '0.65rem',
          fontWeight: 600,
          textAlign: 'center',
          color: unlocked ? 'text.primary' : 'text.secondary',
          lineHeight: 1.3,
        }}
      >
        {unlocked ? label : tStats('locked')}
      </Typography>
    </Box>
  );

  return (
    <Tooltip
      title={
        unlocked
          ? unlockedAt
            ? tStats('unlockedTooltip', {
                description,
                date: new Date(unlockedAt).toLocaleDateString(locale),
              })
            : description
          : description
      }
      arrow
    >
      <Box>{badge}</Box>
    </Tooltip>
  );
}
