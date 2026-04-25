'use client';
import { Box, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useEffect, useRef, useState } from 'react';

import { useXpAnimation } from '@/contexts/XpAnimationContext';
import { useProgress } from '@/hooks/useProgress';

const BURST_EMOJIS = ['✨', '⭐', '🌟', '💫', '🎉'];

export function XpDisplay({ onClick }: { onClick: () => void }) {
  const { spendableXp } = useProgress();
  const { pendingXp } = useXpAnimation();

  const [xpBounce, setXpBounce] = useState(false);
  const [displayXp, setDisplayXp] = useState(0);
  const [showRing, setShowRing] = useState(false);
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
      setShowRing(true);
      animatingRef.current = true;

      const duration = 800;
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

    const bounceTimer = setTimeout(() => setXpBounce(false), 1000);
    const ringTimer = setTimeout(() => setShowRing(false), 600);
    return () => {
      clearTimeout(bounceTimer);
      clearTimeout(ringTimer);
    };
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
        animation: xpBounce ? 'xpPillBounce 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none',
        boxShadow: xpBounce
          ? `0 0 20px ${alpha('#f59e0b', 0.6)}, 0 0 40px ${alpha('#f59e0b', 0.3)}`
          : 'none',
        '@keyframes xpPillBounce': {
          '0%': { transform: 'scale(1)' },
          '20%': { transform: 'scale(1.3)' },
          '40%': { transform: 'scale(0.9)' },
          '60%': { transform: 'scale(1.15)' },
          '80%': { transform: 'scale(0.97)' },
          '100%': { transform: 'scale(1)' },
        },
        '&:hover': { transform: 'scale(1.05)' },
      }}
    >
      {/* Expanding ring effect */}
      {showRing && (
        <Box
          sx={{
            position: 'absolute',
            inset: -4,
            borderRadius: 8,
            border: `2px solid ${alpha('#f59e0b', 0.6)}`,
            pointerEvents: 'none',
            animation: 'xpRingExpand 0.6s ease-out forwards',
            '@keyframes xpRingExpand': {
              '0%': { transform: 'scale(0.8)', opacity: 1 },
              '100%': { transform: 'scale(1.5)', opacity: 0 },
            },
          }}
        />
      )}

      <Typography
        sx={{
          fontSize: '0.8rem',
          lineHeight: 1,
          animation: xpBounce ? 'xpStarSpin 0.6s ease-in-out' : 'none',
          '@keyframes xpStarSpin': {
            '0%': { transform: 'rotate(0deg) scale(1)' },
            '50%': { transform: 'rotate(180deg) scale(1.5)' },
            '100%': { transform: 'rotate(360deg) scale(1)' },
          },
        }}
      >
        ✨
      </Typography>
      <Typography
        sx={{
          fontSize: '0.85rem',
          color: '#b45309',
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
          fontWeight: 700,
        }}
      >
        {displayXp.toLocaleString()} XP
      </Typography>

      {/* Floating XP pills — fly downward so they aren't clipped by navbar top */}
      {pendingXp.map((evt) => (
        <Box
          key={evt.key}
          sx={{
            position: 'absolute',
            left: '50%',
            top: '100%',
            pointerEvents: 'none',
            zIndex: 20,
            animation: 'xpFlyDown 1.8s cubic-bezier(0.22, 1, 0.36, 1) forwards',
            '@keyframes xpFlyDown': {
              '0%': { opacity: 0, transform: 'translateX(-50%) translateY(-8px) scale(0.2)' },
              '12%': { opacity: 1, transform: 'translateX(-50%) translateY(14px) scale(1.5)' },
              '30%': { opacity: 1, transform: 'translateX(-50%) translateY(28px) scale(1.25)' },
              '55%': { opacity: 1, transform: 'translateX(-50%) translateY(38px) scale(1.1)' },
              '100%': { opacity: 0, transform: 'translateX(-50%) translateY(56px) scale(0.6)' },
            },
          }}
        >
          <Typography
            sx={{
              fontFamily: (t) => t.fonts.cute,
              fontWeight: 800,
              fontSize: '1.15rem',
              color: '#fff',
              textShadow: '0 1px 12px rgba(245,158,11,0.9), 0 0 8px rgba(245,158,11,0.7)',
              background: 'linear-gradient(135deg, #f59e0b, #ef4444, #ec4899)',
              borderRadius: 2.5,
              px: 1.5,
              py: 0.4,
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 16px rgba(245,158,11,0.45)',
            }}
          >
            +{evt.amount} XP
          </Typography>
        </Box>
      ))}

      {/* Emoji burst on gain */}
      {xpBounce &&
        BURST_EMOJIS.map((emoji, i) => {
          const angle = (i / BURST_EMOJIS.length) * Math.PI * 2 - Math.PI / 2;
          const dx = Math.round(Math.cos(angle) * 28);
          const dy = Math.round(Math.sin(angle) * 28);
          return (
            <Box
              key={`burst-${i}`}
              style={{ '--dx': `${dx}px`, '--dy': `${dy}px` } as React.CSSProperties}
              sx={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                fontSize: '0.65rem',
                lineHeight: 1,
                pointerEvents: 'none',
                animation: `xpEmojiBurst 0.7s ${i * 0.05}s ease-out forwards`,
                opacity: 0,
                '@keyframes xpEmojiBurst': {
                  '0%': { opacity: 0, transform: 'translate(-50%, -50%) scale(0)' },
                  '40%': {
                    opacity: 1,
                    transform:
                      'translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(1.2)',
                  },
                  '100%': {
                    opacity: 0,
                    transform:
                      'translate(calc(-50% + var(--dx) * 1.5), calc(-50% + var(--dy) * 1.5)) scale(0)',
                  },
                },
              }}
            >
              {emoji}
            </Box>
          );
        })}
    </Box>
  );
}
