'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { coinBounce } from './animations';

export function CoinBurst({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <Box sx={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999 }}>
      {Array.from({ length: 12 }).map((_, i) => (
        <Typography
          key={i}
          sx={{
            position: 'absolute',
            fontSize: { xs: '1.2rem', sm: '1.5rem' },
            left: `${15 + Math.random() * 70}%`,
            top: `${40 + Math.random() * 40}%`,
            animation: `${coinBounce} ${0.8 + Math.random() * 0.6}s ease-out forwards`,
            animationDelay: `${Math.random() * 0.3}s`,
          }}
        >
          ⭐
        </Typography>
      ))}
    </Box>
  );
}
