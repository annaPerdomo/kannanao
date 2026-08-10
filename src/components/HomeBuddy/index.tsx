'use client';

import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { BOTTOM_NAV_HEIGHT } from '@/components/NavBar/BottomNav';
import { useBuddyFriendshipCtx } from '@/contexts/BuddyFriendshipContext';
import { useBuddyReaction } from '@/contexts/BuddyReactionContext';
import { BUDDY_ART, buddyFaceSrc, FALLBACK_REACTIONS, randomFaceVariant } from '@/lib/buddies';
import { blendHomePhrases } from '@/lib/buddyPhrases';
import { friendshipLevel } from '@/lib/friendship';

import { bounce, heartPop, idleFloat, pulseGlow, tapWiggle, wobble } from './animations';
import { BuddyBubble } from './BuddyBubble';
import { BuddyParticles } from './BuddyParticles';
import { FriendshipHearts } from './FriendshipHearts';

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
  const { petBuddy, canPetToday, ensureLoaded, levelUpEvent, equipped } = useBuddyFriendshipCtx();
  const accent = BUDDY_ART[buddyKey]?.accent ?? brand[300];

  useEffect(() => {
    void ensureLoaded();
  }, [ensureLoaded]);

  const [faceVariant, setFaceVariant] = useState(1);
  useIsomorphicLayoutEffect(() => {
    setFaceVariant(randomFaceVariant());
  }, [buddyKey]);
  const level = friendshipLevel(equipped?.points ?? 0);
  const phrases = useMemo(() => {
    let base = [t('defaultPhrase')];
    let friendshipCopy: unknown = null;
    try {
      const raw = tBuddies.raw(`${buddyKey}.homePhrases`);
      if (isNonEmptyStringArray(raw)) base = raw;
      friendshipCopy = tBuddies.raw(`${buddyKey}.friendship`);
    } catch {
      // missing key — the guards keep whatever resolved before the throw
    }
    return blendHomePhrases(base, friendshipCopy, level);
  }, [buddyKey, level, t, tBuddies]);

  const [bubbleText, setBubbleText] = useState('');
  /** Outranks the ambient phrase, which would otherwise rotate over it. */
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const [showBubble, setShowBubble] = useState(true);
  const [reaction, setReaction] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [sparkles, setSparkles] = useState(false);
  const [tapped, setTapped] = useState(false);
  const [tapHearts, setTapHearts] = useState(false);
  const [petBonus, setPetBonus] = useState(false);
  const phraseIndex = useRef(0);

  // Dragging
  const [isDragging, setIsDragging] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const lastPos = useRef({ x: 0, y: 0 });

  // Keyed on the pool's contents, not its identity: a re-render that rebuilds
  // an identical array would otherwise snap the rotation back to phrase one.
  const phrasesRef = useRef(phrases);
  phrasesRef.current = phrases;
  const phrasePool = phrases.join('␟');
  useEffect(() => {
    phraseIndex.current = 0;
    setBubbleText(phrasesRef.current[0]);
    const interval = setInterval(() => {
      const pool = phrasesRef.current;
      phraseIndex.current = (phraseIndex.current + 1) % pool.length;
      setBubbleText(pool[phraseIndex.current]);
      setShowBubble(true);
    }, 8000);
    return () => clearInterval(interval);
  }, [phrasePool]);

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

  // The story dialog consumes the event, not this — it may be held for a while
  // if the level-up landed mid-session. Only the announcement clears here.
  useEffect(() => {
    if (!levelUpEvent) {
      setAnnouncement(null);
      setSparkles(false);
      return;
    }
    setAnnouncement(
      t('friendship.levelUp', { levelName: t(`friendship.levelNames.${levelUpEvent.level}`) }),
    );
    setShowBubble(true);
    setSparkles(true);
    const timer = setTimeout(() => {
      setAnnouncement(null);
      setSparkles(false);
    }, 3000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelUpEvent]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    setIsDragging(true);
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

  const handleTap = useCallback(() => {
    setTapped(true);
    setTapHearts(true);
    phraseIndex.current = (phraseIndex.current + 1) % phrases.length;
    setBubbleText(phrases[phraseIndex.current]);
    setShowBubble(true);
    setTimeout(() => setTapped(false), 500);
    setTimeout(() => setTapHearts(false), 600);
    // First pet of the day pays a heart; later taps stay a plain (still
    // fun) burst — no call spam, no "limit" messaging.
    if (canPetToday) {
      petBuddy()
        .then((award) => {
          if (!award) return;
          setPetBonus(true);
          setTimeout(() => setPetBonus(false), 900);
        })
        .catch(() => {});
    }
  }, [phrases, canPetToday, petBuddy]);

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      // No matching pointerdown (the hearts chip swallowed it, a second pointer,
      // a lost capture) means lastPos is stale, and a tap it wrongly reads as
      // one would spend the day's pet award.
      if (!dragging.current) return;
      const moved =
        Math.abs(e.clientX - lastPos.current.x) + Math.abs(e.clientY - lastPos.current.y);
      dragging.current = false;
      setIsDragging(false);
      if (moved < 8) handleTap();
    },
    [handleTap],
  );

  // The daily pet pays a heart, so a pointer-only tap would cap keyboard and
  // switch users a heart below everyone else.
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      handleTap();
    },
    [handleTap],
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
      {showBubble && (
        <BuddyBubble text={announcement ?? bubbleText} reaction={reaction} accent={accent} />
      )}

      <Box sx={{ position: 'relative' }}>
        <BuddyParticles sparkles={sparkles} tapHearts={tapHearts} />
        <FriendshipHearts isDragging={isDragging} buddyKey={buddyKey} />

        {petBonus && (
          <Typography
            sx={{
              position: 'absolute',
              top: '10%',
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: '0.85rem',
              fontWeight: 800,
              whiteSpace: 'nowrap',
              animation: `${heartPop} 0.9s ease-out forwards`,
              pointerEvents: 'none',
              zIndex: 1,
            }}
          >
            {t('friendship.petBonus')}
          </Typography>
        )}

        {/* The pet button is the face, not the whole widget: role="button" makes
            its children presentational, which would hide the hearts chip. */}
        <Box
          role="button"
          tabIndex={0}
          aria-label={t('petAria')}
          onKeyDown={handleKeyDown}
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
