'use client';

import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import { alpha, type SxProps, type Theme } from '@mui/material/styles';

import { ACHIEVEMENTS } from '@/hooks/useProgress';

const panelSx: SxProps<Theme> = {
  background: (t) => alpha(t.palette.brand[50], 0.6),
  border: (t) => `1px solid ${alpha(t.palette.brand[300], 0.4)}`,
  borderRadius: 4,
  p: 3,
};

export function StatsSkeleton() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Skeleton variant="rounded" height={96} sx={{ borderRadius: 4 }} />

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton
            key={i}
            variant="rounded"
            height={110}
            sx={{ flex: '1 1 160px', borderRadius: 4 }}
          />
        ))}
      </Box>

      <Paper elevation={0} sx={panelSx}>
        <Skeleton variant="text" width={180} height={28} sx={{ mb: 2.5 }} />
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {ACHIEVEMENTS.map((def) => (
            <Skeleton key={def.key} variant="circular" width={54} height={54} sx={{ m: 1 }} />
          ))}
        </Box>
      </Paper>

      <Paper elevation={0} sx={panelSx}>
        <Skeleton variant="text" width={160} height={28} sx={{ mb: 2 }} />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} height={44} sx={{ my: 0.5 }} />
        ))}
      </Paper>

      <Paper elevation={0} sx={{ ...panelSx, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        <Skeleton variant="text" width={160} height={28} />
        <Skeleton variant="rounded" height={100} sx={{ borderRadius: 2 }} />
        <Skeleton variant="rounded" height={120} sx={{ borderRadius: 2 }} />
      </Paper>
    </Box>
  );
}
