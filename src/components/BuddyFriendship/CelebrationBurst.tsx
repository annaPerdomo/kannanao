'use client';

import Box from '@mui/material/Box';

import { burstFloat } from './animations';

const PARTICLES = ['✨', '💖', '⭐', '💕', '🌟', '✨', '💗', '⭐'];

/** Does not check reduced motion itself — callers gate it. */
export function CelebrationBurst() {
  return (
    <Box
      aria-hidden
      sx={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}
    >
      {PARTICLES.map((glyph, i) => {
        const angle = (i / PARTICLES.length) * Math.PI * 2;
        return (
          <Box
            key={i}
            sx={{
              position: 'absolute',
              top: '45%',
              left: '50%',
              fontSize: '1rem',
              transform: 'scale(0)',
              animation: `${burstFloat} 1.1s ease-out forwards`,
              animationDelay: `${i * 0.07}s`,
              ml: `${Math.cos(angle) * 74}px`,
              mt: `${Math.sin(angle) * 44}px`,
            }}
          >
            {glyph}
          </Box>
        );
      })}
    </Box>
  );
}
