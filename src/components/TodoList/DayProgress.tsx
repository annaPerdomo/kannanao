'use client';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import { XP_PER_TODO } from './helpers';

interface DayProgressProps {
  completedCount: number;
  totalCount: number;
}

export function DayProgress({ completedCount, totalCount }: DayProgressProps) {
  const theme = useTheme();
  const { brand, accent } = theme.palette;
  const t = useTranslations('Todo.dayProgress');
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  if (totalCount === 0) return null;

  // One line: what a tick is worth, the bar, and how far the day has got.
  return (
    <Stack direction="row" alignItems="center" spacing={1.25}>
      <Typography
        sx={{ color: 'text.secondary', fontWeight: 800, fontSize: '0.72rem', whiteSpace: 'nowrap' }}
      >
        {progress === 100 ? t('allDone') : t('xpEach', { xp: XP_PER_TODO })}
      </Typography>
      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{
          flex: 1,
          minWidth: 40,
          height: 8,
          borderRadius: (theme) => theme.radii.pill,
          bgcolor: alpha(brand[200], 0.25),
          '& .MuiLinearProgress-bar': {
            background: `linear-gradient(90deg, ${brand[300]} 0%, ${brand[500]} 50%, ${accent[400]} 100%)`,
            borderRadius: (theme) => theme.radii.pill,
            transition: 'width 0.6s ease',
          },
        }}
      />
      <Typography
        sx={{ color: brand[700], fontWeight: 800, fontSize: '0.72rem', whiteSpace: 'nowrap' }}
      >
        {t('doneCount', { completed: completedCount, total: totalCount })}
      </Typography>
    </Stack>
  );
}
