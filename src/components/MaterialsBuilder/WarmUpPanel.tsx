'use client';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import type { WarmUpWord } from '@/types/lessonPlan';

interface WarmUpPanelProps {
  warmUp: WarmUpWord[];
}

export function WarmUpPanel({ warmUp }: WarmUpPanelProps) {
  const t = useTranslations('Group.lessonBuilder');
  const theme = useTheme();
  const { brand } = theme.palette;

  if (warmUp.length === 0) return null;

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, sm: 2.5 },
        borderRadius: theme.radii.lg,
        border: `1px solid ${alpha(brand[300], 0.4)}`,
        bgcolor: 'background.paper',
      }}
    >
      <Stack spacing={1.5}>
        <Box>
          <Typography component="h3" sx={{ fontWeight: 800, color: 'text.primary' }}>
            {t('warmUpTitle')}
          </Typography>
          <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', mt: 0.5 }}>
            {t('warmUpHint')}
          </Typography>
        </Box>

        <Stack spacing={1}>
          {warmUp.map((entry) => (
            <Box
              key={entry.word}
              sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}
            >
              <Typography sx={{ fontSize: '0.9rem', color: 'text.primary' }}>
                {entry.reading ? `${entry.word}（${entry.reading}）` : entry.word}
                {' — '}
                {entry.meaning}
              </Typography>
              <Chip
                size="small"
                label={t('warmUpFromDeck', { deck: entry.deckName })}
                sx={{ bgcolor: alpha(brand[300], 0.2), color: 'text.secondary' }}
              />
            </Box>
          ))}
        </Stack>
      </Stack>
    </Paper>
  );
}
