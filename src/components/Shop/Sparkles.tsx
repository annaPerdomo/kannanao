'use client';

import Box from '@mui/material/Box';
import { sparkle } from './animations';

export function Sparkles({ color, count = 8 }: { color: string; count?: number }) {
  return (
    <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {Array.from({ length: count }).map((_, i) => (
        <Box
          key={i}
          sx={{
            position: 'absolute',
            width: { xs: 4, sm: 6 },
            height: { xs: 4, sm: 6 },
            borderRadius: '50%',
            backgroundColor: color,
            top: `${10 + Math.random() * 80}%`,
            left: `${5 + Math.random() * 90}%`,
            animation: `${sparkle} ${1.5 + Math.random() * 2}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 2}s`,
            opacity: 0.3,
          }}
        />
      ))}
    </Box>
  );
}
