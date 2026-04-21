'use client';
import { useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

interface XpEarnedPopProps {
  amount: number;
  correct: boolean;
  show: boolean;
}

const SPARKLE_EMOJIS = ['✨', '⭐', '🌟', '💫', '🎉', '💖', '🔥'];

export function XpEarnedPop({ amount, correct, show }: XpEarnedPopProps) {
  const sparkles = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const dist = 40 + (i % 3) * 15;
        return {
          id: i,
          dx: Math.round(Math.cos(angle) * dist),
          dy: Math.round(Math.sin(angle) * dist),
          emoji: SPARKLE_EMOJIS[i % SPARKLE_EMOJIS.length],
          delay: `${i * 0.04}s`,
          size: `${0.6 + (i % 3) * 0.15}rem`,
        };
      }),
    [],
  );

  if (!show) return null;
  return (
    <Box
      sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        pointerEvents: 'none',
        zIndex: 30,
      }}
    >
      {/* Screen flash */}
      <Box
        sx={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 29,
          animation: correct ? 'xpScreenFlash 0.6s ease-out forwards' : 'none',
          '@keyframes xpScreenFlash': {
            '0%': { background: 'radial-gradient(circle at 50% 50%, rgba(245,158,11,0.25), transparent 70%)' },
            '100%': { background: 'radial-gradient(circle at 50% 50%, rgba(245,158,11,0), transparent 70%)' },
          },
        }}
      />

      {/* Sparkle burst ring */}
      {correct &&
        sparkles.map((s) => (
          <Box
            key={s.id}
            style={{ '--dx': `${s.dx}px`, '--dy': `${s.dy}px` } as React.CSSProperties}
            sx={{
              position: 'absolute',
              left: 0,
              top: 0,
              fontSize: s.size,
              lineHeight: 1,
              animation: `xpSparkleBurst 0.8s ${s.delay} cubic-bezier(0.34, 1.56, 0.64, 1) forwards`,
              opacity: 0,
              '@keyframes xpSparkleBurst': {
                '0%': { opacity: 0, transform: 'translate(-50%, -50%) scale(0)' },
                '30%': { opacity: 1, transform: 'translate(calc(-50% + var(--dx) * 0.6), calc(-50% + var(--dy) * 0.6)) scale(1.3)' },
                '70%': { opacity: 0.8, transform: 'translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(1)' },
                '100%': { opacity: 0, transform: 'translate(calc(-50% + var(--dx) * 1.2), calc(-50% + var(--dy) * 1.2)) scale(0)' },
              },
            }}
          >
            {s.emoji}
          </Box>
        ))}

      {/* Main XP badge */}
      <Box
        sx={{
          animation: 'xpEarnedBurst 1.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
          '@keyframes xpEarnedBurst': {
            '0%': { opacity: 0, transform: 'translate(-50%, -50%) scale(0.2) rotate(-15deg)' },
            '15%': { opacity: 1, transform: 'translate(-50%, -70%) scale(1.6) rotate(5deg)' },
            '30%': { transform: 'translate(-50%, -85%) scale(1.3) rotate(-3deg)' },
            '50%': { opacity: 1, transform: 'translate(-50%, -100%) scale(1.1) rotate(0deg)' },
            '100%': { opacity: 0, transform: 'translate(-50%, -150%) scale(0.7) rotate(0deg)' },
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
              fontSize: correct ? '1.2rem' : '0.8rem',
              lineHeight: 1,
              animation: 'xpIconSpin 0.6s ease-in-out',
              '@keyframes xpIconSpin': {
                '0%': { transform: 'scale(0) rotate(-180deg)' },
                '50%': { transform: 'scale(1.5) rotate(10deg)' },
                '100%': { transform: 'scale(1) rotate(0deg)' },
              },
            }}
          >
            {correct ? '🌟' : '💪'}
          </Typography>
          <Typography
            sx={{
              fontFamily: (t) => t.fonts.cute,
              fontWeight: 800,
              fontSize: correct ? '1.6rem' : '1.1rem',
              background: correct
                ? 'linear-gradient(135deg, #fbbf24, #f59e0b, #ef4444, #ec4899)'
                : 'linear-gradient(135deg, #94a3b8, #64748b)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: 'none',
              filter: correct ? 'drop-shadow(0 3px 8px rgba(245,158,11,0.5))' : 'none',
              whiteSpace: 'nowrap',
            }}
          >
            +{amount} XP
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
