'use client';
import { useEffect, useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useProgress } from '@/hooks/useProgress';
import { useXpAnimation } from '@/contexts/XpAnimationContext';

export function XpDisplay({ onClick }: { onClick: () => void }) {
  const { spendableXp } = useProgress();
  const { pendingXp } = useXpAnimation();

  const [xpBounce, setXpBounce] = useState(false);
  const [displayXp, setDisplayXp] = useState(0);
  const animatingRef = useRef(false);
  const seenEventsRef = useRef(0);

  useEffect(() => {
    if (!animatingRef.current) {
      setDisplayXp(spendableXp);
    }
  }, [spendableXp]);

  useEffect(() => {
    if (pendingXp.length <= seenEventsRef.current) return;
    const newEvents = pendingXp.slice(seenEventsRef.current);
    seenEventsRef.current = pendingXp.length;

    const totalGain = newEvents.reduce((sum, e) => sum + e.amount, 0);

    setDisplayXp((prev) => {
      const startXp = prev;
      const targetXp = startXp + totalGain;

      setXpBounce(true);
      animatingRef.current = true;

      const duration = 600;
      const startTime = Date.now();

      const tick = () => {
        const elapsed = Date.now() - startTime;
        const t = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        setDisplayXp(Math.round(startXp + (targetXp - startXp) * eased));
        if (t < 1) {
          requestAnimationFrame(tick);
        } else {
          animatingRef.current = false;
        }
      };
      requestAnimationFrame(tick);

      return startXp;
    });

    const bounceTimer = setTimeout(() => setXpBounce(false), 800);
    return () => clearTimeout(bounceTimer);
  }, [pendingXp]);

  return (
    <Box
      onClick={onClick}
      sx={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        background: (theme) =>
          `linear-gradient(135deg, ${alpha(theme.palette.brand[100], 0.85)}, ${alpha('#fef3c7', 0.85)})`,
        border: `1.5px solid ${alpha('#f59e0b', 0.4)}`,
        borderRadius: 6,
        px: 1.25,
        py: 0.4,
        cursor: 'pointer',
        overflow: 'visible',
        transition: 'transform 0.15s, box-shadow 0.15s',
        animation: xpBounce ? 'xpPillBounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none',
        boxShadow: xpBounce ? `0 0 16px ${alpha('#f59e0b', 0.5)}` : 'none',
        '@keyframes xpPillBounce': {
          '0%': { transform: 'scale(1)' },
          '30%': { transform: 'scale(1.2)' },
          '60%': { transform: 'scale(0.95)' },
          '100%': { transform: 'scale(1)' },
        },
        '&:hover': { transform: 'scale(1.05)' },
      }}
    >
      <Typography sx={{ fontSize: '0.8rem', lineHeight: 1 }}>✨</Typography>
      <Typography
        sx={{
          fontFamily: '"DM Serif Display", serif',
          fontSize: '0.85rem',
          color: '#b45309',
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
          fontWeight: 600,
        }}
      >
        {displayXp.toLocaleString()} XP
      </Typography>

      {pendingXp.map((evt) => (
        <Box
          key={evt.key}
          sx={{
            position: 'absolute',
            left: '50%',
            bottom: '100%',
            pointerEvents: 'none',
            zIndex: 20,
            animation: 'xpFlyToNav 1.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
            '@keyframes xpFlyToNav': {
              '0%': { opacity: 0, transform: 'translateX(-50%) translateY(20px) scale(0.3)' },
              '20%': { opacity: 1, transform: 'translateX(-50%) translateY(-18px) scale(1.3)' },
              '50%': { opacity: 1, transform: 'translateX(-50%) translateY(-30px) scale(1.1)' },
              '80%': { opacity: 0.8, transform: 'translateX(-50%) translateY(-8px) scale(0.9)' },
              '100%': { opacity: 0, transform: 'translateX(-50%) translateY(0px) scale(0.5)' },
            },
          }}
        >
          <Typography
            sx={{
              fontFamily: '"Fredoka", sans-serif',
              fontWeight: 700,
              fontSize: '0.9rem',
              color: '#fff',
              textShadow: '0 1px 8px rgba(245,158,11,0.7), 0 0 4px rgba(245,158,11,0.5)',
              background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
              borderRadius: 2,
              px: 1,
              py: 0.25,
              whiteSpace: 'nowrap',
            }}
          >
            +{evt.amount} XP
          </Typography>
        </Box>
      ))}
    </Box>
  );
}
