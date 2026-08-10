'use client';

import Box from '@mui/material/Box';

import { heartPop, sparkleFloat } from './animations';

interface BuddyParticlesProps {
  sparkles: boolean;
  tapHearts: boolean;
}

export function BuddyParticles({ sparkles, tapHearts }: BuddyParticlesProps) {
  return (
    <>
      {sparkles &&
        [0, 1, 2, 3, 4].map((i) => (
          <Box
            key={`sparkle-${i}`}
            sx={{
              position: 'absolute',
              top: '20%',
              left: '50%',
              fontSize: '0.8rem',
              animation: `${sparkleFloat} 0.6s ease-out forwards`,
              animationDelay: `${i * 0.08}s`,
              transform: 'scale(0)',
              ml: `${Math.cos(i * 1.25) * 18}px`,
              mt: `${Math.sin(i * 1.25) * 12}px`,
              pointerEvents: 'none',
            }}
          >
            {['✨', '⭐', '💖', '🌟', '✨'][i]}
          </Box>
        ))}

      {tapHearts &&
        [0, 1, 2, 3, 4, 5].map((i) => (
          <Box
            key={`heart-${i}`}
            sx={{
              position: 'absolute',
              top: '25%',
              left: '50%',
              fontSize: '1rem',
              animation: `${heartPop} 0.6s ease-out forwards`,
              animationDelay: `${i * 0.06}s`,
              ml: `${Math.cos(i * 1.05) * 24}px`,
              mt: `${Math.sin(i * 1.05) * 20}px`,
              pointerEvents: 'none',
            }}
          >
            {['💕', '💖', '✨', '💗', '🌟', '💞'][i]}
          </Box>
        ))}
    </>
  );
}
