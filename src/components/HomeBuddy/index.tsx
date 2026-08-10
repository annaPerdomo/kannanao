'use client';

import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { BOTTOM_NAV_HEIGHT } from '@/components/NavBar/BottomNav';
import { useBuddyReaction } from '@/contexts/BuddyReactionContext';
import { BUDDY_ART, buddyFaceSrc, FALLBACK_REACTIONS, randomFaceVariant } from '@/lib/buddies';

import { bounce, idleFloat, pulseGlow, tapWiggle, wobble } from './animations';
import { BuddyBubble } from './BuddyBubble';
import { BuddyParticles } from './BuddyParticles';

// SSR renders face 1 and the effect swaps in the random one before paint, so
// the randomness never reaches hydration.
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

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
      {showBubble && <BuddyBubble text={bubbleText} reaction={reaction} accent={accent} />}

      <Box sx={{ position: 'relative' }}>
        <BuddyParticles sparkles={sparkles} tapHearts={tapHearts} />

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
