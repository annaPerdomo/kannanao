'use client';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import { kanaSetLabel } from '@/lib/lessonKana';

const MAX_CHIPS = 4;

interface WeekKanaChipsProps {
  kanaSets: string[];
}

export function WeekKanaChips({ kanaSets }: WeekKanaChipsProps) {
  const t = useTranslations('Materials.library');
  const theme = useTheme();
  const { brand } = theme.palette;

  if (kanaSets.length === 0) return null;

  const shown = kanaSets.slice(0, MAX_CHIPS);
  const extra = kanaSets.length - shown.length;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25, flexWrap: 'wrap' }}>
      <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mr: 0.25 }}>
        {t('soundsLabel')}
      </Typography>
      {shown.map((setId) => (
        <Chip
          key={setId}
          size="small"
          label={kanaSetLabel(setId)}
          sx={{
            height: 20,
            fontSize: '0.7rem',
            fontWeight: 700,
            bgcolor: alpha(brand[200], 0.3),
            color: brand[800],
          }}
        />
      ))}
      {extra > 0 && (
        <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>+{extra}</Typography>
      )}
    </Box>
  );
}
