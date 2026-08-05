'use client';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import type { MasteryCounts } from '@/hooks/useGroup';

interface MasteryBreakdownProps {
  mastery: MasteryCounts;
}

export function MasteryBreakdown({ mastery }: MasteryBreakdownProps) {
  const theme = useTheme();
  const { brand, success, warning, grey } = theme.palette;
  const t = useTranslations('Group.masteryBreakdown');
  const total = mastery.new + mastery.learning + mastery.strong;

  if (total === 0) return null;

  const segments = [
    { key: 'new' as const, count: mastery.new, color: grey[400], dark: grey[700] },
    { key: 'learning' as const, count: mastery.learning, color: warning.main, dark: warning.dark },
    { key: 'strong' as const, count: mastery.strong, color: success.main, dark: success.dark },
  ];

  return (
    <Box sx={{ mb: 3 }}>
      <Typography
        sx={{
          fontWeight: 800,
          fontSize: '0.85rem',
          color: brand[700],
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          mb: 1.5,
        }}
      >
        {t('heading')}
      </Typography>
      <Paper
        elevation={0}
        sx={{
          p: 2,
          border: `1px solid ${alpha(brand[300], 0.3)}`,
          borderRadius: 3,
          bgcolor: alpha(brand[50], 0.4),
        }}
      >
        <Box sx={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', mb: 1.5 }}>
          {segments.map(
            (s) =>
              s.count > 0 && (
                <Box
                  key={s.key}
                  sx={{ width: `${(s.count / total) * 100}%`, bgcolor: s.color }}
                  aria-hidden="true"
                />
              ),
          )}
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {segments.map((s) => (
            <Chip
              key={s.key}
              label={`${t(s.key)}: ${s.count}`}
              size="small"
              sx={{
                fontSize: '0.72rem',
                fontWeight: 700,
                bgcolor: alpha(s.color, 0.15),
                color: s.dark,
              }}
            />
          ))}
        </Box>
      </Paper>
    </Box>
  );
}
