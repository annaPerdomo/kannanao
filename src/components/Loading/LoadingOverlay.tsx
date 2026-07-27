'use client';

import Box from '@mui/material/Box';
import type { ReactNode } from 'react';

import { Loading } from './Loading';

interface LoadingOverlayProps {
  /** Not localized here — callers pass translated text (see Common.loading). */
  message?: string;
  children: ReactNode;
}

/**
 * The full-surface loading state: Tango over the page's own skeleton.
 *
 * The skeleton stays in flow because it is what reserves the height — drop it
 * and the page collapses to the mascot, then jumps when the data lands.
 */
export function LoadingOverlay({ message, children }: LoadingOverlayProps) {
  return (
    <Box sx={{ position: 'relative', width: '100%' }}>
      <Box aria-hidden sx={{ filter: 'blur(2px)', opacity: 0.6 }}>
        {children}
      </Box>
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          justifyContent: 'center',
          // Top-anchored: centring strands the mascot below the fold on
          // skeletons taller than a screen (the dashboard's is).
          alignItems: 'flex-start',
          pt: { xs: 4, sm: 8 },
          zIndex: 1,
        }}
      >
        <Loading message={message} />
      </Box>
    </Box>
  );
}
