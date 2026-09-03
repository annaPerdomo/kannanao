'use client';
import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

interface CollectedBarProps {
  collected: number;
  total: number;
  label: string;
  ariaLabel: string;
}

export function CollectedBar({ collected, total, label, ariaLabel }: CollectedBarProps) {
  const pct = total === 0 ? 0 : Math.round((collected / total) * 100);
  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
        <Typography sx={{ fontWeight: 800, color: 'text.primary' }}>{label}</Typography>
        <Typography sx={{ fontWeight: 700, color: 'text.secondary' }}>{pct}%</Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={pct}
        aria-label={ariaLabel}
        sx={{ height: 10, borderRadius: 999 }}
      />
    </Box>
  );
}

export function CollectedPanel({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        p: { xs: 2, sm: 2.5 },
        borderRadius: 4,
        bgcolor: (t) => alpha(t.palette.brand[50], 0.7),
        border: (t) => `1.5px solid ${alpha(t.palette.brand[300], 0.4)}`,
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { sm: 'center' },
        gap: 2,
      }}
    >
      {children}
    </Box>
  );
}
