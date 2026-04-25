'use client';

import Box from '@mui/material/Box';
import { alpha, keyframes, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useCallback, useEffect, useRef, useState } from 'react';

import { BUDDY_CONFIG, BUDDY_HOME_PHRASES } from '@/hooks/useShop';

const idleFloat = keyframes`
  0%, 100% { transform: translateY(0) rotate(-2deg); }
  50% { transform: translateY(-8px) rotate(2deg); }
`;

const bubbleIn = keyframes`
  0% { transform: scale(0) translateY(4px); opacity: 0; }
  50% { transform: scale(1.08) translateY(-1px); opacity: 1; }
  100% { transform: scale(1) translateY(0); opacity: 1; }
`;

const tapWiggle = keyframes`
  0% { transform: scale(1) rotate(0deg); }
  20% { transform: scale(1.15) rotate(-12deg); }
  40% { transform: scale(0.95) rotate(8deg); }
  60% { transform: scale(1.1) rotate(-5deg); }
  80% { transform: scale(1) rotate(3deg); }
  100% { transform: scale(1) rotate(0deg); }
`;

const heartPop = keyframes`
  0% { transform: scale(0); opacity: 1; }
  50% { transform: scale(1.4); opacity: 0.8; }
  100% { transform: scale(0.3) translateY(-22px); opacity: 0; }
`;

const pulseGlow = keyframes`
  0%, 100% { box-shadow: 0 6px 20px rgba(0,0,0,0.08); }
  50% { box-shadow: 0 6px 28px rgba(0,0,0,0.12), 0 0 20px rgba(244,114,182,0.15); }
`;

const BUDDY_ACCENTS: Record<string, string> = {
  buddy_pink_cat: '#F472B6',
  buddy_bunny: '#FDA4AF',
  buddy_penguin: '#7DD3FC',
  buddy_panda: '#86EFAC',
  buddy_fox: '#FCD34D',
};

interface HomeBuddyProps {
  buddyKey: string;
}

export function HomeBuddy({ buddyKey }: HomeBuddyProps) {
  const theme = useTheme();
  const { brand } = theme.palette;
  const config = BUDDY_CONFIG[buddyKey];
  const accent = BUDDY_ACCENTS[buddyKey] ?? brand[300];
  const phrases = BUDDY_HOME_PHRASES[buddyKey] ?? ["Let's study!"];

  const [bubbleText, setBubbleText] = useState('');
  const [showBubble, setShowBubble] = useState(true);
  const [tapped, setTapped] = useState(false);
  const [tapHearts, setTapHearts] = useState(false);
  const phraseIndex = useRef(0);

  // Dragging
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const lastPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    setBubbleText(phrases[0]);
    const interval = setInterval(() => {
      phraseIndex.current = (phraseIndex.current + 1) % phrases.length;
      setBubbleText(phrases[phraseIndex.current]);
      setShowBubble(true);
    }, 8000);
    return () => clearInterval(interval);
  }, [phrases]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    lastPos.current = { x: e.clientX, y: e.clientY };
    el.setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const x = e.clientX - dragOffset.current.x;
    const y = e.clientY - dragOffset.current.y;
    setPos({
      x: Math.max(0, Math.min(x, window.innerWidth - 80)),
      y: Math.max(0, Math.min(y, window.innerHeight - 80)),
    });
  }, []);

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      const moved =
        Math.abs(e.clientX - lastPos.current.x) + Math.abs(e.clientY - lastPos.current.y);
      dragging.current = false;
      if (moved < 8) {
        setTapped(true);
        setTapHearts(true);
        phraseIndex.current = (phraseIndex.current + 1) % phrases.length;
        setBubbleText(phrases[phraseIndex.current]);
        setShowBubble(true);
        setTimeout(() => setTapped(false), 500);
        setTimeout(() => setTapHearts(false), 600);
      }
    },
    [phrases],
  );

  if (!config) return null;

  const positionStyle = pos
    ? { left: pos.x, top: pos.y, bottom: 'auto', right: 'auto' }
    : { bottom: { xs: 16, sm: 28 }, right: { xs: 12, sm: 24 } };

  return (
    <Box
      sx={{
        position: 'fixed',
        ...positionStyle,
        zIndex: 1200,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.75,
        cursor: 'grab',
        touchAction: 'none',
        userSelect: 'none',
        '&:active': { cursor: 'grabbing' },
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {showBubble && (
        <Box
          key={bubbleText}
          sx={{
            position: 'relative',
            bgcolor: alpha('#fff', 0.95),
            backdropFilter: 'blur(8px)',
            border: `1.5px solid ${alpha(accent, 0.4)}`,
            borderRadius: 2.5,
            px: 1.5,
            py: 0.75,
            maxWidth: 160,
            boxShadow: `0 4px 16px ${alpha(brand[400], 0.12)}`,
            animation: `${bubbleIn} 0.35s ease-out`,
            pointerEvents: 'none',
            '&::after': {
              content: '""',
              position: 'absolute',
              bottom: -6,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: `6px solid ${alpha('#fff', 0.95)}`,
            },
          }}
        >
          <Typography
            sx={{
              fontSize: '0.72rem',
              fontWeight: 700,
              color: brand[700],
              textAlign: 'center',
              lineHeight: 1.3,
            }}
          >
            {bubbleText}
          </Typography>
        </Box>
      )}

      <Box sx={{ position: 'relative' }}>
        {/* Heart burst on tap */}
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

        <Box
          sx={{
            width: { xs: 56, sm: 64 },
            height: { xs: 56, sm: 64 },
            borderRadius: '50%',
            bgcolor: alpha('#fff', 0.92),
            border: `2.5px solid ${alpha(accent, 0.5)}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: tapped
              ? `${tapWiggle} 0.5s ease-in-out`
              : `${idleFloat} 3s ease-in-out infinite, ${pulseGlow} 3s ease-in-out infinite`,
            fontSize: { xs: '2rem', sm: '2.3rem' },
            lineHeight: 1,
            boxShadow: `0 6px 20px ${alpha(accent, 0.2)}`,
          }}
        >
          {config.emoji}
        </Box>

        <Box
          sx={{
            width: 36,
            height: 5,
            borderRadius: '50%',
            bgcolor: alpha(accent, 0.1),
            mx: 'auto',
            mt: 0.25,
          }}
        />
      </Box>
    </Box>
  );
}
