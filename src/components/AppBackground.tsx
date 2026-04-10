'use client';
import Box from '@mui/material/Box';
import { alpha } from '@mui/material/styles';
import type { ReactNode } from 'react';

/**
 * Full-page wrapper that applies the theme-aware radial gradient background.
 * Must be a client component so the sx function can access the live theme.
 */
export function AppBackground({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={(theme) => ({
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
        backgroundImage: `
          radial-gradient(circle at 20% 20%, ${alpha(theme.palette.brand[300], 0.18)} 0%, transparent 28%),
          radial-gradient(circle at 80% 15%, ${alpha(theme.palette.accent[300], 0.14)} 0%, transparent 26%),
          radial-gradient(circle at 50% 85%, ${alpha(theme.palette.brand[200], 0.7)} 0%, transparent 32%)
        `,
      })}
    >
      {children}
    </Box>
  );
}
