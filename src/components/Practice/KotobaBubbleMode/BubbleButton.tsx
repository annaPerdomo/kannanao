'use client';
import Box from '@mui/material/Box';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { BUBBLE_COLORS } from './constants';

interface BubbleButtonProps {
  particle: string;
  index: number;
  disabled: boolean;
  state: 'idle' | 'correct' | 'wrong';
  onClick: () => void;
}

export function BubbleButton({ particle, index, disabled, state, onClick }: BubbleButtonProps) {
  const color = BUBBLE_COLORS[index % BUBBLE_COLORS.length];

  return (
    <Box
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={`Particle ${particle}`}
      onClick={disabled ? undefined : onClick}
      onKeyDown={
        disabled
          ? undefined
          : (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
      }
      sx={{
        width: { xs: 76, sm: 96 },
        height: { xs: 76, sm: 96 },
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: disabled ? 'default' : 'pointer',
        userSelect: 'none',
        position: 'relative',
        transition: 'transform 0.2s ease, opacity 0.3s ease',

        // Floating animation — each bubble offset
        animation: state === 'idle' ? `float${index % 3} 3s ease-in-out infinite` : undefined,
        animationDelay: `${index * 0.3}s`,

        background:
          state === 'correct'
            ? 'radial-gradient(circle at 35% 35%, #86EFAC, #22C55E 70%)'
            : state === 'wrong'
              ? 'radial-gradient(circle at 35% 35%, #FCA5A5, #EF4444 70%)'
              : `radial-gradient(circle at 35% 35%, ${alpha(color, 0.3)}, ${color} 70%)`,

        boxShadow:
          state === 'correct'
            ? '0 0 24px rgba(34,197,94,0.5)'
            : state === 'wrong'
              ? '0 0 24px rgba(239,68,68,0.4)'
              : `0 6px 20px ${alpha(color, 0.35)}`,

        // Pop animation on correct
        ...(state === 'correct' && {
          animation: 'bubblePop 0.5s ease-out forwards',
        }),

        // Wobble on wrong
        ...(state === 'wrong' && {
          animation: 'bubbleWobble 0.5s ease-out',
        }),

        // Shine highlight
        '&::before': {
          content: '""',
          position: 'absolute',
          top: '15%',
          left: '20%',
          width: '30%',
          height: '25%',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.7), transparent)',
          pointerEvents: 'none',
        },

        ...(!disabled &&
          state === 'idle' && {
            '&:hover': {
              transform: 'scale(1.12)',
            },
          }),

        '@keyframes float0': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        '@keyframes float1': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px) translateX(3px)' },
        },
        '@keyframes float2': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px) translateX(-3px)' },
        },
        '@keyframes bubblePop': {
          '0%': { transform: 'scale(1)', opacity: 1 },
          '50%': { transform: 'scale(1.3)', opacity: 0.8 },
          '100%': { transform: 'scale(1.1)', opacity: 1 },
        },
        '@keyframes bubbleWobble': {
          '0%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-8px)' },
          '40%': { transform: 'translateX(8px)' },
          '60%': { transform: 'translateX(-4px)' },
          '80%': { transform: 'translateX(4px)' },
          '100%': { transform: 'translateX(0)' },
        },
      }}
    >
      <Typography
        sx={{
          fontSize: { xs: '1.7rem', sm: '2.1rem' },
          fontWeight: 900,
          color: '#fff',
          textShadow: '0 2px 4px rgba(0,0,0,0.2)',
          fontFamily: (t) => t.fonts.jp,
        }}
      >
        {particle}
      </Typography>
    </Box>
  );
}
