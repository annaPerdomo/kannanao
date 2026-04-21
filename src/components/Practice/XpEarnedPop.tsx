'use client';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

interface XpEarnedPopProps {
  amount: number;
  correct: boolean;
  show: boolean;
}

export function XpEarnedPop({ amount, correct, show }: XpEarnedPopProps) {
  if (!show) return null;
  return (
    <Box
      sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        pointerEvents: 'none',
        zIndex: 30,
        animation: 'xpEarnedBurst 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        '@keyframes xpEarnedBurst': {
          '0%': {
            opacity: 0,
            transform: 'translate(-50%, -50%) scale(0.2) rotate(-10deg)',
          },
          '25%': {
            opacity: 1,
            transform: 'translate(-50%, -80%) scale(1.4) rotate(3deg)',
          },
          '50%': {
            opacity: 1,
            transform: 'translate(-50%, -100%) scale(1.1) rotate(-2deg)',
          },
          '100%': {
            opacity: 0,
            transform: 'translate(-50%, -140%) scale(0.8) rotate(0deg)',
          },
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0.25,
        }}
      >
        <Typography
          sx={{
            fontSize: '0.7rem',
            lineHeight: 1,
            animation: 'xpSparkle 0.6s ease-in-out infinite alternate',
            '@keyframes xpSparkle': {
              from: { transform: 'scale(1) rotate(-5deg)' },
              to: { transform: 'scale(1.3) rotate(5deg)' },
            },
          }}
        >
          {correct ? '🌟' : '💪'}
        </Typography>
        <Typography
          sx={{
            fontFamily: (t) => t.fonts.cute,
            fontWeight: 700,
            fontSize: correct ? '1.3rem' : '1rem',
            background: correct
              ? 'linear-gradient(135deg, #f59e0b, #ef4444, #ec4899)'
              : 'linear-gradient(135deg, #94a3b8, #64748b)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: 'none',
            filter: correct ? 'drop-shadow(0 2px 6px rgba(245,158,11,0.4))' : 'none',
            whiteSpace: 'nowrap',
          }}
        >
          +{amount} XP
        </Typography>
      </Box>
    </Box>
  );
}
