'use client';

import BarChartIcon from '@mui/icons-material/BarChart';
import { Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';

import { ModeBreakdownPills } from '@/components/Stats/ModeBreakdownPills';

import type { MemberModeBreakdownEntry } from './types';

interface MemberModeBreakdownProps {
  modes: MemberModeBreakdownEntry[];
}

/** Site-wide split of MemberActivity's "Cards Studied" column, last 90 days. */
export function MemberModeBreakdown({ modes }: MemberModeBreakdownProps) {
  const theme = useTheme();
  const { brand } = theme.palette;

  if (modes.length === 0) return null;

  return (
    <>
      <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 2 }}>
        <BarChartIcon sx={{ color: brand[500] }} />
        <Typography
          sx={{
            fontFamily: (t) => t.fonts.cute,
            fontWeight: 600,
            fontSize: '1.2rem',
            color: brand[700],
          }}
        >
          Practice Mode Breakdown
        </Typography>
      </Stack>
      <ModeBreakdownPills
        items={modes.map((m) => ({ mode: m.mode, count: m.cardsStudied }))}
        formatCount={(count) => `${count} cards`}
      />
    </>
  );
}
