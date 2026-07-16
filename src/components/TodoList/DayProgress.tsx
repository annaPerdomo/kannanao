'use client';
import Box from '@mui/material/Box';
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

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="flex-end" spacing={1} mb={0.75}>
        <Typography sx={{ color: 'text.disabled', fontWeight: 700, fontSize: '0.68rem' }}>
          {progress === 100 ? t('allDone') : t('xpEach', { xp: XP_PER_TODO })}
        </Typography>
        <Typography sx={{ color: brand[700], fontWeight: 800, fontSize: '0.72rem' }}>
          {progress === 100 ? '🎊' : '🌟'}{' '}
          {t('doneCount', { completed: completedCount, total: totalCount })}
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{
          height: 10,
          borderRadius: 5,
          bgcolor: alpha(brand[200], 0.25),
          '& .MuiLinearProgress-bar': {
            background: `linear-gradient(90deg, ${brand[400]} 0%, ${brand[500]} 40%, ${accent[400]} 100%)`,
            borderRadius: 5,
            transition: 'width 0.6s ease',
          },
        }}
      />
    </Box>
  );
}
