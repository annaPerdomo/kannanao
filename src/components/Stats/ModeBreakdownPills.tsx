'use client';

import Box from '@mui/material/Box';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import type { SessionMode } from '@/hooks/useProgress';

import { modeColor, modeLabel } from './constants';

interface ModeBreakdownPillsProps {
  items: { mode: string; count: number }[];
  /** Caller formats the count so the unit (sessions, cards, ×N) stays explicit. */
  formatCount: (count: number) => string;
}

export function ModeBreakdownPills({ items, formatCount }: ModeBreakdownPillsProps) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
      {items.map(({ mode, count }) => {
        const color = modeColor(mode as SessionMode);
        return (
          <Box
            key={mode}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              px: 1.25,
              py: 0.4,
              borderRadius: 99,
              bgcolor: alpha(color, 0.12),
              border: `1px solid ${alpha(color, 0.3)}`,
            }}
          >
            <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color }}>
              {modeLabel(mode as SessionMode)}
            </Typography>
            <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>
              {formatCount(count)}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}
