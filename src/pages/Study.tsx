'use client';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { Box, Button, Chip, IconButton, LinearProgress, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Flashcard } from '@/components/Flashcard';
import { Loading } from '@/components/Loading';
import { PageHeader } from '@/components/PageHeader';
import { CelebrationScreen } from '@/components/Practice/CelebrationScreen';
import { XpEarnedPop } from '@/components/Practice/XpEarnedPop';
import { StudyBuddy } from '@/components/StudyBuddy';
import { useXpAnimation } from '@/contexts/XpAnimationContext';
import { useCards } from '@/hooks/useCards';
import { useDecks } from '@/hooks/useDecks';
import { useProgress, XP_PER_CORRECT } from '@/hooks/useProgress';
import { useShop } from '@/hooks/useShop';
import { LAYOUT } from '@/theme';

interface StudyProps {
  deckId: string;
  onBack: () => void;
}

// Exit animation duration — card slides out before the next one slides in.
const SLIDE_DURATION_MS = 260;

// Portrait trading-card dimensions (2.5 : 3.5 ratio)
const CARD_W = 320;
const CARD_H = 452;

// ── Sparkle stars that float up on each new card ──────────────────────────────
const SPARKLE_ITEMS = [
  { emoji: '✨', left: 10, delay: 0.04 },
  { emoji: '⭐', left: 24, delay: 0 },
  { emoji: '💫', left: 40, delay: 0.1 },
  { emoji: '✨', left: 57, delay: 0.06 },
  { emoji: '🌟', left: 72, delay: 0.02 },
  { emoji: '⭐', left: 87, delay: 0.12 },
];

export default function Study({ deckId, onBack }: StudyProps) {
  const theme = useTheme();
  const { brand, accent } = theme.palette;
  const { cards, loading: cardsLoading } = useCards(deckId);
  const { decks, loading: decksLoading } = useDecks();
  const { equipped } = useShop();
  const { triggerXpEarned } = useXpAnimation();
  const equippedBuddy = equipped['study_buddy'];
  const [index, setIndex] = useState(0);
  const [navigating, setNavigating] = useState(false);
  // 1 = navigating forward (new card enters from right), -1 = backward (from left)
  const [navDir, setNavDir] = useState<1 | -1>(1);
  const [showCelebration, setShowCelebration] = useState(false);
  const [xpPop, setXpPop] = useState<{ amount: number; key: number } | null>(null);

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

  const showXpPop = useCallback(
    (amount: number) => {
      setXpPop({ amount, key: Date.now() });
      triggerXpEarned(amount);
      setTimeout(() => setXpPop(null), 1300);
    },
    [triggerXpEarned],
  );

  // Mark the first card as seen on mount (once cards load)
  useEffect(() => {
    if (cards.length > 0 && sessionIdRef.current && !seenRef.current.has(0)) {
      seenRef.current.add(0);
      void recordAnswer(sessionIdRef.current, true, cards[0].jlptLevel);
      showXpPop(XP_PER_CORRECT);
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
  const deckName = deck ? deck.name : 'Deck';

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
          showXpPop(XP_PER_CORRECT);
        }
      }, SLIDE_DURATION_MS);
    },
    [navigating, index, cards.length, recordAnswer, showXpPop],
  );

  if (cardsLoading || decksLoading) {
    return (
      <Box sx={{ maxWidth: LAYOUT.narrowMaxWidth, mx: 'auto', px: LAYOUT.pagePx, py: 6 }}>
        <Loading message="Loading your decks…" />
      </Box>
    );
  }

  if (cards.length === 0) {
    return (
      <Box
        sx={{
          maxWidth: LAYOUT.narrowMaxWidth,
          mx: 'auto',
          px: LAYOUT.pagePx,
          py: 6,
          textAlign: 'center',
        }}
      >
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
        mx: 'auto',
        px: LAYOUT.pagePx,
        py: 4,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header — same container as Practice page */}
      <PageHeader
        title={deckName}
        onBack={handleBack}
        badge={`${cards.length} cards`}
        compact
        mb={3}
      />

      {/* Progress bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <LinearProgress
          variant="determinate"
          value={((index + 1) / cards.length) * 100}
          sx={{
            flexGrow: 1,
            height: 6,
            borderRadius: 99,
            bgcolor: alpha(brand[300], 0.18),
            '& .MuiLinearProgress-bar': {
              borderRadius: 99,
              background: `linear-gradient(90deg, ${brand[200]} 0%, ${brand[400]} 50%, ${accent[300]} 100%)`,
            },
          }}
        />
        <Chip
          label={`${index + 1} / ${cards.length}`}
          size="small"
          sx={{
            bgcolor: alpha(brand[300], 0.18),
            color: brand[700],
            fontWeight: 600,
            border: `1px solid ${alpha(brand[300], 0.4)}`,
          }}
        />
      </Box>

      {/* Card — dealer-deal animation: new card flips in from above like tossed onto a pile */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          perspective: '1000px',
          position: 'relative',
        }}
      >
        <Box
          key={index}
          sx={{
            width: CARD_W,
            height: CARD_H,
            flexShrink: 0,
            position: 'relative',
            transformOrigin: 'top center',
            '@keyframes dealIn': {
              '0%': {
                transform: 'translateY(-90px) rotateX(-42deg) rotateZ(4deg) scale(0.82)',
                opacity: 0,
              },
              '55%': { opacity: 1 },
              '100%': {
                transform: 'translateY(0) rotateX(0deg) rotateZ(0deg) scale(1)',
                opacity: 1,
              },
            },
            '@keyframes dealInBack': {
              '0%': {
                transform: 'translateY(-90px) rotateX(-42deg) rotateZ(-4deg) scale(0.82)',
                opacity: 0,
              },
              '55%': { opacity: 1 },
              '100%': {
                transform: 'translateY(0) rotateX(0deg) rotateZ(0deg) scale(1)',
                opacity: 1,
              },
            },
            '@keyframes sparkleUp': {
              from: { transform: 'translateY(0) scale(1)', opacity: 0.9 },
              to: { transform: 'translateY(-64px) scale(0)', opacity: 0 },
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

          {xpPop && <XpEarnedPop amount={xpPop.amount} correct show key={xpPop.key} />}

          {/* Sparkle burst — float up from bottom of card on each new card */}
          {!navigating &&
            SPARKLE_ITEMS.map((s, i) => (
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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          mt: 3,
        }}
      >
        <IconButton
          onClick={() => navigate(-1)}
          disabled={index === 0 || navigating}
          sx={{
            border: `1px solid ${alpha(brand[300], 0.45)}`,
            bgcolor: brand[50],
            '&:not(:disabled):hover': { borderColor: brand[500] },
          }}
        >
          <ArrowBackIcon />
        </IconButton>

        <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: '0.08em' }}>
          TAP CARD TO FLIP
        </Typography>

        <IconButton
          onClick={() => navigate(1)}
          disabled={index === cards.length - 1 || navigating}
          sx={{
            border: `1px solid ${alpha(brand[300], 0.45)}`,
            bgcolor: brand[50],
            '&:not(:disabled):hover': { borderColor: brand[500] },
          }}
        >
          <ArrowForwardIcon />
        </IconButton>
      </Box>

      {index === cards.length - 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Button variant="outlined" onClick={() => setShowCelebration(true)}>
            Finish Session ✨
          </Button>
        </Box>
      )}

      {showCelebration && (
        <CelebrationScreen
          heading="すごい！"
          subheading={`You studied all ${cards.length} cards!`}
          mode="study"
          onExit={handleBack}
        />
      )}

      {equippedBuddy && <StudyBuddy buddyKey={equippedBuddy} reaction="idle" />}
    </Box>
  );
}
