'use client';
import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import type { GroupMember } from '@/hooks/useGroup';

import { accuracyFraction, accuracyTone } from './derive';
import { accuracyLabel } from './format';

interface AccuracyCellProps {
  member: GroupMember;
}

export function AccuracyCell({ member }: AccuracyCellProps) {
  const theme = useTheme();
  const t = useTranslations('Group.learnersTable');
  const fraction = accuracyFraction(member);

  if (fraction === null) {
    return (
      <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
        {accuracyLabel(member, t)}
      </Typography>
    );
  }

  const pct = Math.round(fraction * 100);
  const color = theme.palette[accuracyTone(fraction)].main;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'flex-end' }}>
      <Typography
        sx={{ fontSize: '0.85rem', fontWeight: 700, color: 'text.primary', minWidth: 34 }}
      >
        {t('accuracyValue', { pct })}
      </Typography>
      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{
          width: 56,
          height: 6,
          borderRadius: 3,
          bgcolor: alpha(theme.palette.brand[200], 0.5),
          '& .MuiLinearProgress-bar': { borderRadius: 3, bgcolor: color },
        }}
      />
    </Box>
  );
}
