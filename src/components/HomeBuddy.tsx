'use client';

import Box from '@mui/material/Box';
import { alpha, keyframes, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { BOTTOM_NAV_HEIGHT } from '@/components/NavBar/BottomNav';
import { useBuddyReaction } from '@/contexts/BuddyReactionContext';
import { BUDDY_ART, buddyFaceSrc, FALLBACK_REACTIONS, randomFaceVariant } from '@/lib/buddies';

// SSR renders face 1 and the effect swaps in the random one before paint, so
// the randomness never reaches hydration.
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const idleFloat = keyframes`
  0%, 100% { transform: translateY(0) rotate(-2deg); }
  50% { transform: translateY(-8px) rotate(2deg); }
`;

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

const sparkleFloat = keyframes`
  0% { transform: scale(0) translateY(0); opacity: 1; }
  100% { transform: scale(1) translateY(-20px); opacity: 0; }
`;

const pulseGlow = keyframes`
  0%, 100% { box-shadow: 0 6px 20px rgba(0,0,0,0.08); }
  50% { box-shadow: 0 6px 28px rgba(0,0,0,0.12), 0 0 20px rgba(244,114,182,0.15); }
`;

function pickRandom(items: string | string[]): string {
  if (typeof items === 'string') return items;
  return items[Math.floor(Math.random() * items.length)];
}

function isNonEmptyStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.every((v) => typeof v === 'string');
}

interface HomeBuddyProps {
  buddyKey: string;
}

/**
 * The single global buddy widget — mounted once (via GlobalBuddy) and shown
 * on every page. It cycles ambient "home" phrases on its own, and reacts to
 * correct/wrong answers from whatever practice screen is active via
 * BuddyReactionContext, since no page renders its own buddy instance.
 */
export function HomeBuddy({ buddyKey }: HomeBuddyProps) {
  const t = useTranslations('Home.buddy');
  const tBuddies = useTranslations('Shop.buddies');
  const theme = useTheme();
  const { brand } = theme.palette;
  const { reactionEvent } = useBuddyReaction();
  const accent = BUDDY_ART[buddyKey]?.accent ?? brand[300];

  const [faceVariant, setFaceVariant] = useState(1);
  useIsomorphicLayoutEffect(() => {
    setFaceVariant(randomFaceVariant());
  }, [buddyKey]);
  const phrases = useMemo(() => {
    try {
      const raw = tBuddies.raw(`${buddyKey}.homePhrases`);
      if (isNonEmptyStringArray(raw)) return raw;
    } catch {
      // missing translation key for this buddyKey — fall back below
    }
    return [t('defaultPhrase')];
  }, [buddyKey, t, tBuddies]);

  const [bubbleText, setBubbleText] = useState('');
  const [showBubble, setShowBubble] = useState(true);
  const [reaction, setReaction] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [sparkles, setSparkles] = useState(false);
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

  // React to correct/wrong answers reported by whatever practice screen is
  // active. Keyed on reactionEvent.key (not just .reaction) so firing the
  // same reaction twice in a row still re-triggers the bubble/animation.
  useEffect(() => {
    if (!reactionEvent) return;

    let lines: string | string[] = FALLBACK_REACTIONS[reactionEvent.reaction];
    try {
      const raw = tBuddies.raw(`${buddyKey}.${reactionEvent.reaction}`);
      if (isNonEmptyStringArray(raw)) lines = raw;
    } catch {
      // missing translation key — keep the English fallback above
    }

    setReaction(reactionEvent.reaction);
    setBubbleText(pickRandom(lines));
    setShowBubble(true);
    setSparkles(reactionEvent.reaction === 'correct');

    const reactionTimer = setTimeout(() => {
      setReaction('idle');
      setShowBubble(false);
    }, 2500);
    const sparkleTimer = setTimeout(() => setSparkles(false), 800);
    return () => {
      clearTimeout(reactionTimer);
      clearTimeout(sparkleTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reactionEvent?.key]);

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

  const positionStyle = pos
    ? { left: pos.x, top: pos.y, bottom: 'auto', right: 'auto' }
    : {
        bottom: { xs: `calc(${BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom) + 8px)`, sm: 28 },
        right: { xs: 12, sm: 24 },
      };

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
        : alpha(accent, 0.4);

  const textColor =
    reaction === 'correct' ? '#059669' : reaction === 'wrong' ? '#DC2626' : brand[700];

  const emojiAnimation = tapped
    ? `${tapWiggle} 0.5s ease-in-out`
    : reaction === 'correct'
      ? `${bounce} 0.7s ease-in-out`
      : reaction === 'wrong'
        ? `${wobble} 0.5s ease-in-out`
        : `${idleFloat} 3s ease-in-out infinite, ${pulseGlow} 3s ease-in-out infinite`;

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
            bgcolor: bubbleColor,
            backdropFilter: 'blur(8px)',
            border: `1.5px solid ${bubbleBorder}`,
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
              borderTop: `6px solid ${bubbleColor}`,
            },
          }}
        >
          <Typography
            sx={{
              fontSize: '0.72rem',
              fontWeight: 700,
              color: textColor,
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
            animation: emojiAnimation,
            boxShadow: `0 6px 20px ${alpha(accent, 0.2)}`,
            transition: 'box-shadow 0.2s',
          }}
        >
          <Box
            component="img"
            src={buddyFaceSrc(buddyKey, faceVariant)}
            alt=""
            draggable={false}
            sx={{
              width: { xs: 46, sm: 52 },
              height: { xs: 46, sm: 52 },
              objectFit: 'contain',
              pointerEvents: 'none',
            }}
          />
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
