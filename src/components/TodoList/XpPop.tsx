'use client';
import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';

import { XP_PER_TODO } from './helpers';

interface XpPopProps {
  show: boolean;
}

export function XpPop({ show }: XpPopProps) {
  const theme = useTheme();
  const { brand, accent } = theme.palette;
  if (!show) return null;
  return (
    <Box
      sx={{
        position: 'absolute',
        top: '-6px',
        right: 6,
        pointerEvents: 'none',
        zIndex: 10,
        fontSize: '0.72rem',
        fontWeight: 800,
        color: 'secondary.dark',
        background: `linear-gradient(90deg, ${brand[100]}, ${accent[100]})`,
        border: `1.5px solid ${alpha(accent[300], 0.5)}`,
        borderRadius: 2.5,
        px: 0.75,
        py: 0.25,
        whiteSpace: 'nowrap',
        animation: 'xp-fly 0.9s ease forwards',
        '@keyframes xp-fly': {
          '0%': { opacity: 1, transform: 'translateY(0) scale(1)' },
          '60%': { opacity: 1, transform: 'translateY(-20px) scale(1.1)' },
          '100%': { opacity: 0, transform: 'translateY(-32px) scale(0.9)' },
        },
      }}
    >
      +{XP_PER_TODO} XP ✨
    </Box>
  );
}
