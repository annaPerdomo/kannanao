'use client';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import {
  Box,
  Button,
  Chip,
  IconButton,
  LinearProgress,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ComboChip } from '@/components/ComboChip';
import { Flashcard } from '@/components/Flashcard';
import FuriganaText from '@/components/FuriganaText';
import { Loading } from '@/components/Loading';
import { PageHeader } from '@/components/PageHeader';
import { CelebrationScreen, pickPraise } from '@/components/Practice/CelebrationScreen';
import { XpEarnedPop } from '@/components/Practice/XpEarnedPop';
import { PracticeStage } from '@/components/PracticeStage';
import { useBuddyReaction } from '@/contexts/BuddyReactionContext';
import { useXpAnimation } from '@/contexts/XpAnimationContext';
import { useCombo } from '@/hooks/useCombo';
import { useFuriganaMask } from '@/hooks/useFuriganaMask';
import { type SessionMode, useProgress, XP_PER_WRONG } from '@/hooks/useProgress';
import type { ComboStepResult } from '@/lib/combo';
import { cardXp } from '@/lib/flashcardUtils';
import { LAYOUT } from '@/theme';
import type { Flashcard as FlashcardType } from '@/types/flashcard';

/**
 * When a parent (the review quest) owns the session, it passes a controller so
 * FlipStudy grades INTO that one session instead of starting its own. In that
 * mode it starts/ends no `study_sessions` row and shows no celebration/chest —
 * it just runs the flip cards and calls `onComplete` when the last is graded.
 */
export interface FlipStudyController {
  /** Records the graded card (SRS + XP + combo) and returns the combo result. */
  onGrade: (card: FlashcardType, correct: boolean) => ComboStepResult;
  /** All cards graded — advance to the next quest node. */
  onComplete: () => void;
  /** Live combo count from the quest, for the chip. */
  comboCount: number;
}

export interface FlipStudyProps {
  /** The ordered cards to study — a single deck (Study) or cross-deck due cards (Review). */
  cards: FlashcardType[];
  /** Header title, e.g. the deck name or "Smart Review". */
  title: string;
  /** Header badge; defaults to the card count. */
  badge?: string;
  /** Session type recorded for this run (drives the practice-mode breakdown). */
  sessionMode: SessionMode;
  /** deck_id stored on the session row; null for cross-deck review. */
  sessionDeckId: string | null;
  onBack: () => void;
  /** True while the parent is still fetching cards. */
  loading?: boolean;
  loadingMessage?: string;
  /** Rendered when there are no cards (e.g. Review's "all done" screen). */
  emptyState?: React.ReactNode;
  /** Celebration subheading; defaults to "You studied all N cards!". */
  completionSubheading?: string;
  /** Present when embedded in the review quest (parent owns the session). */
  controller?: FlipStudyController;
  /** Quest step map (Warm-up/Word Match/Boss Round/Chest), rendered between the header and the progress bar. */
  questMap?: React.ReactNode;
}

// Exit animation duration — card slides out before the next one slides in.
const SLIDE_DURATION_MS = 260;

// Portrait trading-card dimensions (2.5 : 3.5 ratio).
const CARD_W = 320;
const CARD_H = 452;
const CARD_ASPECT_RATIO = `${CARD_W} / ${CARD_H}`;
/** Below this the card is too small to read; the page scrolls instead. */
const CARD_MIN_H = 280;

/**
 * Floor for the self-grading row, sized for the taller of the two buttons:
 * "Got it" carries furigana, and the ruby annotation adds a line above the
 * Japanese label.
 */
const GRADE_ROW_PX = 74;

// ── Sparkle stars that float up on each new card ──────────────────────────────
const SPARKLE_ITEMS = [
  { emoji: '✨', left: 10, delay: 0.04 },
  { emoji: '⭐', left: 24, delay: 0 },
  { emoji: '💫', left: 40, delay: 0.1 },
  { emoji: '✨', left: 57, delay: 0.06 },
  { emoji: '🌟', left: 72, delay: 0.02 },
  { emoji: '⭐', left: 87, delay: 0.12 },
];

/**
 * The flip-with-self-grading study flow: a stack of cards the student flips and
 * grades ("Still learning" / "Got it"), each answer recorded once into per-card
 * progress. Deck study and cross-deck Smart Review both drive it — the only
 * difference is which cards come in and how the session is labelled.
 */
export default function FlipStudy({
  cards,
  title,
  badge,
  sessionMode,
  sessionDeckId,
  onBack,
  loading = false,
  loadingMessage,
  emptyState,
  completionSubheading,
  controller,
  questMap,
}: FlipStudyProps) {
  const t = useTranslations('Study.flipStudy');
  const tCommon = useTranslations('Common');
  const theme = useTheme();
  const { brand, accent } = theme.palette;
  // Phones keep the arrows under the card: flanking them there costs the card
  // ~90px of width, which shrinks it more than the freed bottom row gives back.
  const arrowsBelow = useMediaQuery(theme.breakpoints.down('sm'));
  const { triggerXpEarned } = useXpAnimation();
  const { triggerReaction } = useBuddyReaction();
  const isFuriganaMasked = useFuriganaMask(cards);
  const embedded = !!controller;
  const [index, setIndex] = useState(0);
  const [navigating, setNavigating] = useState(false);
  // 1 = navigating forward (new card enters from right), -1 = backward (from left)
  const [navDir, setNavDir] = useState<1 | -1>(1);
  const [showCelebration, setShowCelebration] = useState(false);
  const [xpPop, setXpPop] = useState<{ amount: number; correct: boolean; key: number } | null>(
    null,
  );
  // A one-way latch: flipping back doesn't re-hide grading. navigate() clears it
  // so the next card starts locked again.
  const [revealed, setRevealed] = useState(false);
  const handleFlipChange = useCallback((flipped: boolean) => {
    if (flipped) setRevealed(true);
  }, []);

  // ── Session tracking ──────────────────────────────────────────────────────
  // Standalone flip (deck Study) owns its own session + combo. When embedded in
  // the quest, the controller owns both and these go unused.
  const { startSession, recordAnswer, endSession, addBonusXp } = useProgress();
  const standaloneCombo = useCombo(addBonusXp);
  const comboCount = controller ? controller.comboCount : standaloneCombo.count;
  // Stable per-session pick so the completion phrase doesn't flicker on re-render.
  const praiseSeed = useMemo(() => Math.floor(Math.random() * 1000), []);
  const [sessionId, setSessionId] = useState('');
  const startTimeRef = useRef<number>(Date.now());
  // Indices the student has graded (each counts once); its size is cards studied.
  const gradedRef = useRef<Set<number>>(new Set());
  // How many of those graded cards were marked "got it" — for the perfect-session
  // achievement, which now reflects real self-grading rather than auto-correct.
  const correctRef = useRef(0);
  const endedRef = useRef(false);

  // Start the session once cards are available (Review fetches them async, so
  // the session must wait until there's something to review).
  const hasCards = cards.length > 0;
  useEffect(() => {
    // Embedded runs inside the quest's session — never open a second one.
    if (loading || !hasCards || embedded) return;
    let cancelled = false;
    startSession(sessionDeckId, sessionMode).then((id) => {
      if (cancelled) return;
      setSessionId(id);
      startTimeRef.current = Date.now();
    });
    return () => {
      cancelled = true;
    };
  }, [loading, hasCards, sessionDeckId, sessionMode, startSession, embedded]);

  // The card-local "+N XP" burst. Standalone also fires the nav-bar count-up;
  // when embedded, the controller fires it (once) so it isn't doubled.
  const flashXpPop = useCallback((amount: number, correct: boolean) => {
    setXpPop({ amount, correct, key: Date.now() });
    setTimeout(() => setXpPop(null), 1300);
  }, []);

  const finishSession = useCallback(async () => {
    if (embedded || endedRef.current || !sessionId) return;
    endedRef.current = true;
    await endSession(sessionId, {
      cardsStudied: gradedRef.current.size,
      cardsCorrect: correctRef.current,
      durationSecs: Math.round((Date.now() - startTimeRef.current) / 1000),
    });
  }, [embedded, endSession, sessionId]);

  // The session closes when the finish screen appears, not when its button is
  // tapped: in a quest that button hands off to the next leg instead of
  // exiting, and a session left open never counts. finishSession is idempotent.
  useEffect(() => {
    if (showCelebration) finishSession().catch(() => {});
  }, [showCelebration, finishSession]);

  const handleBack = useCallback(() => {
    finishSession().catch(() => {});
    onBack();
  }, [finishSession, onBack]);
  // ─────────────────────────────────────────────────────────────────────────

  const card = cards[index];

  // Slide the current card out, then swap content and slide the new card in.
  // `navigating` blocks further clicks mid-transition. Browsing alone no longer
  // records anything — only self-grading (handleGrade) writes progress.
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
        setRevealed(false);
      }, SLIDE_DURATION_MS);
    },
    [navigating, index, cards.length],
  );

  // Self-grade the current card, then move on. Records the answer into per-card
  // progress once per card; grading the last card ends the session.
  const handleGrade = useCallback(
    (correct: boolean) => {
      // Standalone needs a session row; embedded grades through the controller.
      if (navigating || !card || (!embedded && !sessionId)) return;

      if (!gradedRef.current.has(index)) {
        gradedRef.current.add(index);
        if (correct) correctRef.current += 1;
        const amount = correct ? cardXp(card.jlptLevel) : XP_PER_WRONG;
        flashXpPop(amount, correct);

        let combo: ComboStepResult;
        if (controller) {
          combo = controller.onGrade(card, correct);
        } else {
          triggerXpEarned(amount);
          void recordAnswer(sessionId, correct, card.jlptLevel, card.id);
          combo = standaloneCombo.onAnswer(correct);
        }
        if (combo.bonusAwarded > 0) triggerReaction('correct');
      }

      if (index < cards.length - 1) {
        navigate(1);
      } else if (controller) {
        controller.onComplete();
      } else {
        setShowCelebration(true);
      }
    },
    [
      navigating,
      embedded,
      sessionId,
      card,
      index,
      cards.length,
      controller,
      recordAnswer,
      triggerXpEarned,
      triggerReaction,
      standaloneCombo,
      flashXpPop,
      navigate,
    ],
  );

  // One pair only, wherever it renders — a hidden duplicate pair would still be
  // in the accessibility tree under the same labels.
  const navButton = (direction: 1 | -1) => (
    <IconButton
      onClick={() => navigate(direction)}
      disabled={(direction === -1 ? index === 0 : index === cards.length - 1) || navigating}
      aria-label={direction === -1 ? t('previousCardAria') : t('nextCardAria')}
      sx={{
        border: `1px solid ${alpha(brand[300], 0.45)}`,
        bgcolor: brand[50],
        '&:not(:disabled):hover': { borderColor: brand[500] },
      }}
    >
      {direction === -1 ? <ArrowBackIcon /> : <ArrowForwardIcon />}
    </IconButton>
  );

  if (loading) {
    return (
      <Box
        sx={{
          maxWidth: LAYOUT.narrowMaxWidth,
          mx: 'auto',
          px: LAYOUT.pagePx,
          py: { xs: 3, sm: 6 },
        }}
      >
        <Loading message={loadingMessage ?? tCommon('loading')} />
      </Box>
    );
  }

  if (cards.length === 0) {
    if (emptyState) return <>{emptyState}</>;
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
          {tCommon('back')}
        </Button>
        <Typography color="text.secondary" sx={{ mt: 3 }}>
          {t('emptyMessage')}
        </Typography>
      </Box>
    );
  }

  return (
    <PracticeStage>
      {/* Header — same container as Practice page */}
      <PageHeader
        title={title}
        onBack={handleBack}
        badge={badge ?? t('cardsBadge', { count: cards.length })}
        compact
        mb={{ xs: 1.5, sm: 2 }}
      />

      {/* One column on every screen: with the arrows flanking the card from sm
          up, status + card + grading stack inside ~630px — short landscape
          viewports need no side rail. */}
      <Box
        sx={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '1fr',
          gridTemplateRows: `auto minmax(${CARD_MIN_H}px, 1fr) auto`,
        }}
      >
        <Box>
          {questMap}

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              mb: { xs: 1.5, sm: 2 },
            }}
          >
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
            <ComboChip count={comboCount} />
            <Chip
              label={t('progressLabel', { current: index + 1, total: cards.length })}
              size="small"
              sx={{
                bgcolor: alpha(brand[300], 0.18),
                color: brand[700],
                fontWeight: 600,
                border: `1px solid ${alpha(brand[300], 0.4)}`,
              }}
            />
          </Box>
        </Box>

        {/* The slot between the arrows is the 100% the card's maxWidth cap
            measures against. */}
        <Box
          sx={{
            minHeight: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: { sm: 3, md: 5 },
          }}
        >
          {!arrowsBelow && navButton(-1)}
          <Box
            sx={{
              alignSelf: 'stretch',
              minHeight: 0,
              minWidth: 0,
              flex: '0 1 auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              perspective: '1000px',
              position: 'relative',
            }}
          >
            <Box
              key={index}
              sx={{
                height: '100%',
                width: 'auto',
                // Both caps matter: maxHeight stops a tall slot stretching the
                // card past its ratio, maxWidth stops a narrow one pushing it
                // off the sides.
                maxHeight: `${CARD_H}px`,
                maxWidth: `min(${CARD_W}px, 100%)`,
                aspectRatio: CARD_ASPECT_RATIO,
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
              {card && (
                <Flashcard
                  card={card}
                  width="100%"
                  height="100%"
                  onFlipChange={handleFlipChange}
                  maskFurigana={isFuriganaMasked(card.id)}
                />
              )}

              {xpPop && (
                <XpEarnedPop amount={xpPop.amount} correct={xpPop.correct} show key={xpPop.key} />
              )}

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
          {!arrowsBelow && navButton(1)}
        </Box>

        <Box>
          {/* Gated on the reveal: "Got it" only means something once the answer is
            on screen. The row holds its height while empty so the card doesn't
            jump when the buttons arrive. */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              gap: 2,
              mt: { xs: 1.5, sm: 2 },
              minHeight: `${GRADE_ROW_PX}px`,
            }}
          >
            {revealed && (
              <>
                {/* Both use the contained variant's white label. "Still learning"
                  keeps the stock brand 600→700 background; "Got it" swaps its
                  background for the app's signature brand→accent sweep (see the
                  card banners), at the darker 600/700 stops so white stays AA in
                  every palette. NOTE: the variant background is a background-IMAGE —
                  replace it with `background`, never `bgcolor` (which silently
                  paints underneath it). */}
                <Button
                  variant="contained"
                  onClick={() => handleGrade(false)}
                  disabled={navigating}
                  sx={{ flex: 1, maxWidth: 200, py: 1.25, borderRadius: 3 }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 0.25,
                      lineHeight: 1.2,
                    }}
                  >
                    <Box
                      component="span"
                      sx={{
                        fontFamily: (theme) => theme.fonts.jp,
                        fontSize: '1.15rem',
                        fontWeight: 700,
                      }}
                    >
                      {t('stillLearningJp')}
                    </Box>
                    <Box component="span" sx={{ fontSize: '0.8rem', fontWeight: 700 }}>
                      {t('stillLearning')}
                    </Box>
                  </Box>
                </Button>
                <Button
                  variant="contained"
                  onClick={() => handleGrade(true)}
                  disabled={navigating}
                  sx={{
                    flex: 1,
                    maxWidth: 200,
                    py: 1.25,
                    borderRadius: 3,
                    background: `linear-gradient(135deg, ${brand[600]} 0%, ${accent[600]} 100%)`,
                    '&:hover': {
                      background: `linear-gradient(135deg, ${brand[700]} 0%, ${accent[700]} 100%)`,
                    },
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 0.25,
                      lineHeight: 1.2,
                    }}
                  >
                    <Box
                      component="span"
                      sx={{
                        fontFamily: (theme) => theme.fonts.jp,
                        fontSize: '1.15rem',
                        fontWeight: 700,
                        '& rt': { fontSize: '0.6em', opacity: 0.9, fontWeight: 600 },
                      }}
                    >
                      <FuriganaText text={t('gotItJp')} showFurigana />
                    </Box>
                    <Box component="span" sx={{ fontSize: '0.8rem', fontWeight: 700 }}>
                      {t('gotIt')}
                    </Box>
                  </Box>
                </Button>
              </>
            )}
          </Box>

          {arrowsBelow && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                mt: 1,
              }}
            >
              {navButton(-1)}
              {navButton(1)}
            </Box>
          )}

          {index === cards.length - 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1.5 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => (embedded ? controller?.onComplete() : setShowCelebration(true))}
              >
                {embedded ? t('nextRound') : t('finishSession')}
              </Button>
            </Box>
          )}
        </Box>
      </Box>

      {!embedded &&
        showCelebration &&
        (() => {
          const graded = gradedRef.current.size;
          const praise = pickPraise(graded > 0 ? correctRef.current / graded : 1, praiseSeed);
          return (
            <CelebrationScreen
              heading={praise.jp}
              headingEn={praise.en}
              subheading={
                completionSubheading ?? t('completionSubheading', { count: cards.length })
              }
              mode="study"
              onExit={handleBack}
            />
          );
        })()}
    </PracticeStage>
  );
}
