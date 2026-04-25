'use client';

import Box from '@mui/material/Box';
import { alpha, keyframes, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useCallback, useEffect, useRef, useState } from 'react';

import { BUDDY_CONFIG } from '@/hooks/useShop';

const bounce = keyframes`
  0%, 100% { transform: translateY(0) scale(1); }
  20% { transform: translateY(-14px) scale(1.1); }
  40% { transform: translateY(-4px) scale(1); }
  60% { transform: translateY(-10px) scale(1.05); }
  80% { transform: translateY(-2px) scale(1); }
`;

const wobble = keyframes`
  0%, 100% { transform: rotate(0deg) scale(1); }
  20% { transform: rotate(-8deg) scale(0.95); }
  40% { transform: rotate(8deg) scale(0.95); }
  60% { transform: rotate(-5deg) scale(0.98); }
  80% { transform: rotate(3deg) scale(1); }
`;

const idleFloat = keyframes`
  0%, 100% { transform: translateY(0) rotate(-1deg); }
  50% { transform: translateY(-5px) rotate(1deg); }
`;

const bubbleIn = keyframes`
  0% { transform: scale(0) translateY(4px); opacity: 0; }
  50% { transform: scale(1.08) translateY(-1px); opacity: 1; }
  100% { transform: scale(1) translateY(0); opacity: 1; }
`;

const sparkleFloat = keyframes`
  0% { transform: scale(0) translateY(0); opacity: 1; }
  100% { transform: scale(1) translateY(-20px); opacity: 0; }
`;

const pulseGlow = keyframes`
  0%, 100% { box-shadow: 0 4px 16px rgba(0,0,0,0.1); }
  50% { box-shadow: 0 4px 24px rgba(0,0,0,0.15), 0 0 16px rgba(244,114,182,0.2); }
`;

const tapSpin = keyframes`
  0% { transform: scale(1) rotate(0deg); }
  25% { transform: scale(1.2) rotate(-15deg); }
  50% { transform: scale(0.9) rotate(10deg); }
  75% { transform: scale(1.15) rotate(-5deg); }
  100% { transform: scale(1) rotate(0deg); }
`;

const heartBurst = keyframes`
  0% { transform: scale(0); opacity: 1; }
  50% { transform: scale(1.3); opacity: 0.8; }
  100% { transform: scale(0.5) translateY(-18px); opacity: 0; }
`;

const BUDDY_ACCENTS: Record<string, string> = {
  buddy_pink_cat: '#F472B6',
  buddy_bunny: '#FDA4AF',
  buddy_penguin: '#7DD3FC',
  buddy_panda: '#86EFAC',
  buddy_fox: '#FCD34D',
};

const TAP_PHRASES = [
  'Hehe! That tickles!',
  'Again! Again!',
  'Hey~!',
  'Wheee!',
  'So much fun!',
  'You found me!',
  "Let's play!",
  'Tee-hee!',
];

function pickRandom(items: string | string[]): string {
  if (typeof items === 'string') return items;
  return items[Math.floor(Math.random() * items.length)];
}

export type BuddyReaction = 'correct' | 'wrong' | 'idle';

interface StudyBuddyProps {
  buddyKey: string;
  reaction?: BuddyReaction;
}

export function StudyBuddy({ buddyKey, reaction = 'idle' }: StudyBuddyProps) {
  const theme = useTheme();
  const { brand } = theme.palette;
  const config = BUDDY_CONFIG[buddyKey];
  const accent = BUDDY_ACCENTS[buddyKey] ?? brand[300];
  const [showBubble, setShowBubble] = useState(false);
  const [bubbleText, setBubbleText] = useState('');
  const [sparkles, setSparkles] = useState(false);
  const [tapped, setTapped] = useState(false);
  const [tapHearts, setTapHearts] = useState(false);
  const [tapCount, setTapCount] = useState(0);

  // Dragging state
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const lastPos = useRef({ x: 0, y: 0 });

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    lastPos.current = { x: e.clientX, y: e.clientY };
    el.setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const x = e.clientX - dragOffset.current.x;
    const y = e.clientY - dragOffset.current.y;
    const maxX = window.innerWidth - 70;
    const maxY = window.innerHeight - 70;
    setPos({
      x: Math.max(0, Math.min(x, maxX)),
      y: Math.max(0, Math.min(y, maxY)),
    });
  }, []);

  const handleTap = useCallback(() => {
    if (!config) return;
    setTapped(true);
    setTapHearts(true);
    setTapCount((c) => c + 1);
    setBubbleText(TAP_PHRASES[Math.floor(Math.random() * TAP_PHRASES.length)]);
    setShowBubble(true);

    setTimeout(() => setTapped(false), 500);
    setTimeout(() => setTapHearts(false), 600);
    setTimeout(() => setShowBubble(false), 2000);
  }, [config]);

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      const moved =
        Math.abs(e.clientX - lastPos.current.x) + Math.abs(e.clientY - lastPos.current.y);
      dragging.current = false;
      if (moved < 8) {
        handleTap();
      }
    },
    [handleTap],
  );

  useEffect(() => {
    if (!config) return;
    setBubbleText(pickRandom(config.reactions[reaction]));
    setShowBubble(true);
    setSparkles(reaction === 'correct');

    if (reaction !== 'idle') {
      const t = setTimeout(() => setShowBubble(false), 2500);
      const s = setTimeout(() => setSparkles(false), 800);
      return () => {
        clearTimeout(t);
        clearTimeout(s);
      };
    }
  }, [reaction, config]);

  if (!config) return null;

  const emojiAnimation = tapped
    ? `${tapSpin} 0.5s ease-in-out`
    : reaction === 'correct'
      ? `${bounce} 0.7s ease-in-out`
      : reaction === 'wrong'
        ? `${wobble} 0.5s ease-in-out`
        : `${idleFloat} 3s ease-in-out infinite`;

  const bubbleColor =
    reaction === 'correct'
      ? alpha('#059669', 0.08)
      : reaction === 'wrong'
        ? alpha('#DC2626', 0.06)
        : alpha('#fff', 0.95);

  const bubbleBorder =
    reaction === 'correct'
      ? alpha('#059669', 0.3)
      : reaction === 'wrong'
        ? alpha('#DC2626', 0.25)
        : alpha(brand[300], 0.4);

  const positionStyle = pos
    ? { left: pos.x, top: pos.y, bottom: 'auto', right: 'auto' }
    : { bottom: { xs: 16, sm: 24 }, left: { xs: 12, sm: 20 } };

  return (
    <Box
      sx={{
        position: 'fixed',
        ...positionStyle,
        zIndex: 1200,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.5,
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
          key={`${reaction}-${tapCount}-${Date.now()}`}
          sx={{
            position: 'relative',
            bgcolor: bubbleColor,
            backdropFilter: 'blur(8px)',
            border: `1.5px solid ${bubbleBorder}`,
            borderRadius: 2.5,
            px: 1.5,
            py: 0.75,
            maxWidth: 150,
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
              borderTop: `6px solid ${bubbleColor}`,
            },
          }}
        >
          <Typography
            sx={{
              fontSize: '0.7rem',
              fontWeight: 700,
              color:
                reaction === 'correct'
                  ? '#059669'
                  : reaction === 'wrong'
                    ? '#DC2626'
                    : 'text.secondary',
              textAlign: 'center',
              lineHeight: 1.3,
            }}
          >
            {bubbleText}
          </Typography>
        </Box>
      )}

      <Box sx={{ position: 'relative' }}>
        {/* Sparkle particles on correct */}
        {sparkles &&
          [0, 1, 2, 3, 4].map((i) => (
            <Box
              key={i}
              sx={{
                position: 'absolute',
                top: '20%',
                left: '50%',
                fontSize: '0.7rem',
                animation: `${sparkleFloat} 0.6s ease-out forwards`,
                animationDelay: `${i * 0.08}s`,
                transform: 'scale(0)',
                ml: `${Math.cos(i * 1.25) * 16}px`,
                mt: `${Math.sin(i * 1.25) * 10}px`,
                pointerEvents: 'none',
              }}
            >
              {['✨', '⭐', '💖', '🌟', '✨'][i]}
            </Box>
          ))}

        {/* Heart burst on tap */}
        {tapHearts &&
          [0, 1, 2, 3, 4, 5].map((i) => (
            <Box
              key={`heart-${i}`}
              sx={{
                position: 'absolute',
                top: '30%',
                left: '50%',
                fontSize: '0.9rem',
                animation: `${heartBurst} 0.6s ease-out forwards`,
                animationDelay: `${i * 0.06}s`,
                ml: `${Math.cos(i * 1.05) * 22}px`,
                mt: `${Math.sin(i * 1.05) * 18}px`,
                pointerEvents: 'none',
              }}
            >
              {['💕', '💖', '✨', '💗', '🌟', '💞'][i]}
            </Box>
          ))}

        <Box
          sx={{
            width: { xs: 52, sm: 60 },
            height: { xs: 52, sm: 60 },
            borderRadius: '50%',
            bgcolor: alpha('#fff', 0.92),
            border: `2.5px solid ${alpha(accent, 0.5)}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: `${emojiAnimation}, ${reaction === 'idle' && !tapped ? pulseGlow : 'none'} 3s ease-in-out infinite`,
            fontSize: { xs: '1.8rem', sm: '2.1rem' },
            lineHeight: 1,
            boxShadow: `0 4px 16px ${alpha(accent, 0.2)}`,
            transition: 'box-shadow 0.2s',
          }}
        >
          {config.emoji}
        </Box>

        {/* Ground shadow */}
        <Box
          sx={{
            width: 32,
            height: 5,
            borderRadius: '50%',
            bgcolor: alpha(accent, 0.12),
            mx: 'auto',
            mt: 0.25,
          }}
        />
      </Box>
    </Box>
  );
}
