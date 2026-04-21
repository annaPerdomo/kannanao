"use client";
import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
  Box,
  Typography,
  IconButton,
  Button,
  LinearProgress,
  Chip,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

import { Flashcard } from "@/components/Flashcard";
import { Loading } from "@/components/Loading";
import { PageHeader } from "@/components/PageHeader";
import { useCards } from "@/hooks/useCards";
import { useDecks } from "@/hooks/useDecks";
import { useProgress } from "@/hooks/useProgress";
import { useShop, CELEBRATION_THEMES } from "@/hooks/useShop";
import { LAYOUT } from '@/theme';
import { StudyBuddy } from "@/components/StudyBuddy";

interface StudyProps {
  deckId: string;
  onBack: () => void;
}

// Exit animation duration — card slides out before the next one slides in.
const SLIDE_DURATION_MS = 260;

// Portrait trading-card dimensions (2.5 : 3.5 ratio)
const CARD_W = 320;
const CARD_H = 452;

// ── Confetti colours (kawaii palette) ────────────────────────────────────────
const CONFETTI_COLORS = [
  '#F472B6', '#C4B5FD', '#FCD34D', '#67E8F9',
  '#6EE7B7', '#FB923C', '#A78BFA', '#F9A8D4',
  '#FDE68A', '#BAE6FD',
];

// ── Celebration messages (cycles by card count) ───────────────────────────────
const CELEBRATIONS = [
  { big: '🌸', heading: 'すごい！', sub: "You're amazing!" },
  { big: '⭐', heading: 'Excellent!', sub: 'Gold star for you!' },
  { big: '🦋', heading: 'You did it!', sub: 'Beautiful work!' },
  { big: '🎉', heading: 'Fantastic!', sub: 'Keep it up!' },
];

// ── Sparkle stars that float up on each new card ──────────────────────────────
const SPARKLE_ITEMS = [
  { emoji: '✨', left: 10, delay: 0.04 },
  { emoji: '⭐', left: 24, delay: 0 },
  { emoji: '💫', left: 40, delay: 0.10 },
  { emoji: '✨', left: 57, delay: 0.06 },
  { emoji: '🌟', left: 72, delay: 0.02 },
  { emoji: '⭐', left: 87, delay: 0.12 },
];

// ── CelebrationOverlay ────────────────────────────────────────────────────────
function CelebrationOverlay({ cardCount, onDone }: { cardCount: number; onDone: () => void }) {
  const { equipped } = useShop();
  const equippedKey = equipped['celebration'];
  const celebData = equippedKey ? CELEBRATION_THEMES[equippedKey] : undefined;
  const confettiColors = celebData?.colors ?? CONFETTI_COLORS;
  const starRow = celebData?.emojis
    ? Array.from({ length: 5 }, (_, i) => celebData.emojis[i % celebData.emojis.length])
    : ['⭐', '✨', '⭐', '✨', '⭐'];

  // Auto-dismiss after 3.6 s
  useEffect(() => {
    const t = setTimeout(onDone, 3600);
    return () => clearTimeout(t);
  }, [onDone]);

  const msg = CELEBRATIONS[cardCount % CELEBRATIONS.length];

  // Generate confetti once on mount — stable positions via useMemo
  const pieces = useMemo(() =>
    Array.from({ length: 32 }, (_, i) => ({
      id: i,
      left: `${((i / 32) * 100 + Math.sin(i * 1.9) * 7 + 50) % 100}%`,
      delay: `${(i * 0.11) % 2}s`,
      duration: `${1.8 + (i % 5) * 0.28}s`,
      size: `${9 + (i % 4) * 4}px`,
      color: confettiColors[i % confettiColors.length],
      round: i % 3 !== 1,
    })), [confettiColors]);

  return (
    <Box
      onClick={onDone}
      sx={{
        position: 'fixed', inset: 0, zIndex: 9999,
        bgcolor: 'rgba(10, 5, 20, 0.72)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
        animation: 'celebFade 3.6s ease forwards',
        '@keyframes celebFade': {
          '0%': { opacity: 0 },
          '8%': { opacity: 1 },
          '78%': { opacity: 1 },
          '100%': { opacity: 0 },
        },
      }}
    >
      {/* Confetti rain */}
      {pieces.map((p) => (
        <Box
          key={p.id}
          sx={{
            position: 'absolute',
            left: p.left,
            top: '-24px',
            width: p.size,
            height: p.size,
            bgcolor: p.color,
            borderRadius: p.round ? '50%' : '2px',
            animation: `confettiFall ${p.duration} ${p.delay} ease-in both`,
            '@keyframes confettiFall': {
              from: { transform: 'translateY(0) rotate(0deg)', opacity: 1 },
              to:   { transform: 'translateY(110vh) rotate(600deg)', opacity: 0.2 },
            },
          }}
        />
      ))}

      {/* Central message */}
      <Box
        sx={{
          textAlign: 'center', px: 4, py: 3,
          borderRadius: '28px',
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(16px)',
          border: '1.5px solid rgba(255,255,255,0.22)',
          animation: 'celebPop 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
          '@keyframes celebPop': {
            from: { transform: 'scale(0.25) translateY(40px)', opacity: 0 },
            to:   { transform: 'scale(1)    translateY(0)',    opacity: 1 },
          },
        }}
      >
        {/* Bouncing big emoji */}
        <Box sx={{
          fontSize: '4.5rem', lineHeight: 1,
          animation: 'bigBounce 0.9s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both',
          '@keyframes bigBounce': {
            from: { transform: 'scale(0)', opacity: 0 },
            to:   { transform: 'scale(1)', opacity: 1 },
          },
        }}>
          {msg.big}
        </Box>
        <Typography sx={{ mt: 1.5, fontSize: '1.9rem', fontWeight: 900, color: '#fff', textShadow: '0 2px 12px rgba(0,0,0,0.4)' }}>
          {msg.heading}
        </Typography>
        <Typography sx={{ mt: 0.5, fontSize: '1rem', color: 'rgba(255,255,255,0.88)' }}>
          You practiced all <b>{cardCount}</b> cards!
        </Typography>
        {/* Floating mini stars row */}
        <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'center', gap: 0.5 }}>
          {starRow.map((s, i) => (
            <Box key={i} component="span" sx={{
              fontSize: '1.1rem',
              animation: `starWiggle 1.2s ${i * 0.12}s ease-in-out infinite alternate`,
              '@keyframes starWiggle': {
                from: { transform: 'translateY(0) rotate(-8deg)' },
                to:   { transform: 'translateY(-6px) rotate(8deg)' },
              },
            }}>{s}</Box>
          ))}
        </Box>
        <Typography sx={{ mt: 2, fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em', fontFamily: (t) => t.fonts.mono }}>
          TAP ANYWHERE TO CONTINUE
        </Typography>
      </Box>
    </Box>
  );
}

export default function Study({ deckId, onBack }: StudyProps) {
  const { cards, loading: cardsLoading } = useCards(deckId);
  const { decks, loading: decksLoading } = useDecks();
  const { equipped } = useShop();
  const equippedBuddy = equipped['study_buddy'];
  const [index, setIndex] = useState(0);
  const [navigating, setNavigating] = useState(false);
  // 1 = navigating forward (new card enters from right), -1 = backward (from left)
  const [navDir, setNavDir] = useState<1 | -1>(1);
  const [showCelebration, setShowCelebration] = useState(false);

  // ── Session tracking ──────────────────────────────────────────────────────
  const { startSession, recordAnswer, endSession } = useProgress();
  const sessionIdRef = useRef<string>('');
  const startTimeRef = useRef<number>(Date.now());
  const seenRef = useRef<Set<number>>(new Set());
  const endedRef = useRef(false);

  useEffect(() => {
    startSession(deckId, 'study').then((id) => {
      sessionIdRef.current = id;
      startTimeRef.current = Date.now();
    });
  }, [deckId, startSession]);

  // Mark the first card as seen on mount (once cards load)
  useEffect(() => {
    if (cards.length > 0 && sessionIdRef.current && !seenRef.current.has(0)) {
      seenRef.current.add(0);
      void recordAnswer(sessionIdRef.current, true, cards[0].jlptLevel);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards.length]);

  const finishSession = useCallback(async () => {
    if (endedRef.current || !sessionIdRef.current) return;
    endedRef.current = true;
    await endSession(sessionIdRef.current, {
      cardsStudied: seenRef.current.size,
      cardsCorrect: seenRef.current.size,
      durationSecs: Math.round((Date.now() - startTimeRef.current) / 1000),
    });
  }, [endSession]);

  const handleBack = useCallback(async () => {
    await finishSession();
    onBack();
  }, [finishSession, onBack]);
  // ─────────────────────────────────────────────────────────────────────────

  const card = cards[index];
  const deck = decks.find((d) => d.id === deckId);
  const deckName = deck ? deck.name : "Deck";

  // Slide the current card out, then swap content and slide the new card in.
  // `navigating` blocks further clicks mid-transition.
  const navigate = useCallback(
    (direction: 1 | -1) => {
      if (navigating) return;
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= cards.length) return;

      setNavDir(direction);
      setNavigating(true);
      setTimeout(() => {
        setIndex(nextIndex);
        setNavigating(false);

        // Record this card as studied (once per unique index)
        if (sessionIdRef.current && !seenRef.current.has(nextIndex)) {
          seenRef.current.add(nextIndex);
          void recordAnswer(sessionIdRef.current, true, cards[nextIndex].jlptLevel);
        }
      }, SLIDE_DURATION_MS);
    },
    [navigating, index, cards.length, recordAnswer],
  );

  if (cardsLoading || decksLoading) {
    return (
      <Box sx={{ maxWidth: LAYOUT.narrowMaxWidth, mx: "auto", px: LAYOUT.pagePx, py: 6 }}>
        <Loading message="Loading your decks…" />
      </Box>
    );
  }

  if (cards.length === 0) {
    return (
      <Box sx={{ maxWidth: LAYOUT.narrowMaxWidth, mx: "auto", px: LAYOUT.pagePx, py: 6, textAlign: "center" }}>
        <Button startIcon={<ArrowBackIcon />} onClick={handleBack}>
          Back to Deck
        </Button>
        <Typography color="text.secondary" sx={{ mt: 3 }}>
          No cards in this deck yet.
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        maxWidth: LAYOUT.narrowMaxWidth,
        mx: "auto",
        px: LAYOUT.pagePx,
        py: 4,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header — same container as Practice page */}
      <PageHeader title={deckName} onBack={handleBack} badge={`${cards.length} cards`} compact mb={3} />

      {/* Progress bar */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
        <LinearProgress
          variant="determinate"
          value={((index + 1) / cards.length) * 100}
          sx={{
            flexGrow: 1,
            height: 6,
            borderRadius: 99,
            bgcolor: "rgba(249,168,212,0.18)",
            "& .MuiLinearProgress-bar": {
              borderRadius: 99,
              background: "linear-gradient(90deg, #FBCFE8 0%, #F472B6 50%, #C4B5FD 100%)",
            },
          }}
        />
        <Chip
          label={`${index + 1} / ${cards.length}`}
          size="small"
          sx={{
            bgcolor: "rgba(249,168,212,0.18)",
            color: "#BE185D",
            fontWeight: 600,
            border: "1px solid rgba(249,168,212,0.4)",
          }}
        />
      </Box>

      {/* Card — dealer-deal animation: new card flips in from above like tossed onto a pile */}
      <Box sx={{ display: 'flex', justifyContent: 'center', perspective: '1000px', position: 'relative' }}>
        <Box
          key={index}
          sx={{
            width: CARD_W,
            height: CARD_H,
            flexShrink: 0,
            position: 'relative',
            transformOrigin: 'top center',
            '@keyframes dealIn': {
              '0%':   { transform: 'translateY(-90px) rotateX(-42deg) rotateZ(4deg) scale(0.82)', opacity: 0 },
              '55%':  { opacity: 1 },
              '100%': { transform: 'translateY(0) rotateX(0deg) rotateZ(0deg) scale(1)', opacity: 1 },
            },
            '@keyframes dealInBack': {
              '0%':   { transform: 'translateY(-90px) rotateX(-42deg) rotateZ(-4deg) scale(0.82)', opacity: 0 },
              '55%':  { opacity: 1 },
              '100%': { transform: 'translateY(0) rotateX(0deg) rotateZ(0deg) scale(1)', opacity: 1 },
            },
            '@keyframes sparkleUp': {
              from: { transform: 'translateY(0) scale(1)', opacity: 0.9 },
              to:   { transform: 'translateY(-64px) scale(0)', opacity: 0 },
            },
            ...(navigating
              ? {
                  transform: 'translateY(28px) rotateX(12deg) scale(0.91)',
                  opacity: 0,
                  transition: `transform ${SLIDE_DURATION_MS}ms ease-in, opacity ${SLIDE_DURATION_MS}ms ease-in`,
                  pointerEvents: 'none',
                }
              : {
                  animation: `${navDir === 1 ? 'dealIn' : 'dealInBack'} 0.48s cubic-bezier(0.22, 1, 0.36, 1)`,
                }),
          }}
        >
          {card && <Flashcard card={card} width={CARD_W} height={CARD_H} />}

          {/* Sparkle burst — float up from bottom of card on each new card */}
          {!navigating && SPARKLE_ITEMS.map((s, i) => (
            <Box
              key={i}
              sx={{
                position: 'absolute',
                bottom: 16,
                left: `${s.left}%`,
                fontSize: '1rem',
                pointerEvents: 'none',
                animation: `sparkleUp 0.72s ${s.delay}s ease-out both`,
              }}
            >
              {s.emoji}
            </Box>
          ))}
        </Box>
      </Box>

      {/* Navigation */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          mt: 3,
        }}
      >
        <IconButton
          onClick={() => navigate(-1)}
          disabled={index === 0 || navigating}
          sx={{
            border: "1px solid rgba(249,168,212,0.45)",
            bgcolor: "#FFF3F9",
            "&:not(:disabled):hover": { borderColor: "#EC4899" },
          }}
        >
          <ArrowBackIcon />
        </IconButton>

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ letterSpacing: "0.08em" }}
        >
          TAP CARD TO FLIP
        </Typography>

        <IconButton
          onClick={() => navigate(1)}
          disabled={index === cards.length - 1 || navigating}
          sx={{
            border: "1px solid rgba(249,168,212,0.45)",
            bgcolor: "#FFF3F9",
            "&:not(:disabled):hover": { borderColor: "#EC4899" },
          }}
        >
          <ArrowForwardIcon />
        </IconButton>
      </Box>

      {index === cards.length - 1 && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
          <Button variant="outlined" onClick={() => setShowCelebration(true)}>
            Finish Session ✨
          </Button>
        </Box>
      )}

      {showCelebration && (
        <CelebrationOverlay
          cardCount={cards.length}
          onDone={handleBack}
        />
      )}

      {equippedBuddy && <StudyBuddy buddyKey={equippedBuddy} reaction="idle" />}
    </Box>
  );
}
