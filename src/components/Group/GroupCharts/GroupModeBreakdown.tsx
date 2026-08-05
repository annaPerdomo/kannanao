'use client';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import { ModeBreakdownPills } from '@/components/Stats/ModeBreakdownPills';
import type { GroupActivityModeStat } from '@/hooks/useGroupActivity';

interface GroupModeBreakdownProps {
  modes: GroupActivityModeStat[];
}

export function GroupModeBreakdown({ modes }: GroupModeBreakdownProps) {
  const t = useTranslations('Group.charts');

  if (modes.length === 0) {
    return (
      <Box sx={{ py: 5, textAlign: 'center' }}>
        <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
          {t('modeEmpty')}
        </Typography>
      </Box>
    );
  }

  return (
    <ModeBreakdownPills
      items={modes.map((m) => ({ mode: m.mode, count: m.cardsStudied }))}
      formatCount={(count) => t('modeCardsCount', { count })}
    />
  );
}
