'use client';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { Box, Button, Chip, Grid, LinearProgress, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import { useCallback, useEffect, useRef, useState } from 'react';

import FuriganaText, { stripFurigana } from '@/components/FuriganaText';
import { SpeakButton } from '@/components/SpeakButton';
import { type BuddyReaction, StudyBuddy } from '@/components/StudyBuddy';
import { UnsplashAttribution } from '@/components/UnsplashAttribution';
import { useXpAnimation } from '@/contexts/XpAnimationContext';
import { usePracticeQueue } from '@/hooks/usePracticeQueue';
import { useProgress, XP_PER_WRONG } from '@/hooks/useProgress';
import { useShop } from '@/hooks/useShop';
import { cardXp, getFlashcardDisplayText } from '@/lib/flashcardUtils';
import type { Flashcard } from '@/types/flashcard';

import { CelebrationScreen, pickPraise } from './CelebrationScreen';
import { RoundTransition } from './RoundTransition';
import { XpEarnedPop } from './XpEarnedPop';

interface RecallModeProps {
  cards: Flashcard[];
  deckId: string;
  batchSize: number;
  onExit: () => void;
}

function buildChoices(correct: Flashcard, allCards: Flashcard[]): string[] {
  const others = allCards.filter((c) => c.id !== correct.id);
  const count = Math.min(3, others.length);
  const distractors = [...others]
    .sort(() => Math.random() - 0.5)
    .slice(0, count)
    .map((c) => c.meaning);
  return [...distractors, correct.meaning].sort(() => Math.random() - 0.5);
}

const CHOICE_LABELS = ['A', 'B', 'C', 'D'];

export function RecallMode({ cards, deckId, batchSize, onExit }: RecallModeProps) {
  const theme = useTheme();
  const { brand, surfaces } = theme.palette;

  const queue = usePracticeQueue(cards, batchSize);

  const [index, setIndex] = useState(0);
  const [choices, setChoices] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [roundScore, setRoundScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [xpPop, setXpPop] = useState<{ amount: number; correct: boolean; key: number } | null>(
    null,
  );

  const { equipped } = useShop();
  const equippedBuddy = equipped['study_buddy'];
  const [buddyReaction, setBuddyReaction] = useState<BuddyReaction>('idle');

  const { startSession, recordAnswer, endSession } = useProgress();
  const { triggerXpEarned } = useXpAnimation();
  const sessionIdRef = useRef<string>('');
  const startTimeRef = useRef<number>(Date.now());
  const correctCountRef = useRef(0);
  const totalAnsweredRef = useRef(0);

  useEffect(() => {
    startSession(deckId, 'recall').then((id) => {
      sessionIdRef.current = id;
      startTimeRef.current = Date.now();
    });
  }, [deckId, startSession]);

  // Reset per-round state when a new round starts
  useEffect(() => {
    if (queue.roundKey === 0) return;
    setIndex(0);
    setSelected(null);
    setRoundScore(0);
  }, [queue.roundKey]);

  const card = queue.currentCards[index];
  const roundDone = index >= queue.currentCards.length;

  // Rebuild choices whenever the card changes
  useEffect(() => {
    if (card) setChoices(buildChoices(card, cards));
  }, [index, cards, queue.roundKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // When all cards in the round are answered, tell the queue
  useEffect(() => {
    if (roundDone && queue.phase === 'playing') {
      queue.finishRound();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundDone, queue.phase, queue.finishRound]);

  const next = useCallback(() => {
    setIndex((i) => i + 1);
    setSelected(null);
  }, []);

  // Auto-advance 1.2 s after a correct pick
  useEffect(() => {
    if (selected && card && selected === card.meaning) {
      const t = setTimeout(next, 1200);
      return () => clearTimeout(t);
    }
  }, [selected, card, next]);

  const handleSelect = useCallback(
    async (choice: string) => {
      if (selected || !card) return;
      setSelected(choice);
      const correct = choice === card.meaning;
      queue.reportResult(card.id, correct);
      totalAnsweredRef.current += 1;

      const xpAmount = correct ? cardXp(card.jlptLevel) : XP_PER_WRONG;
      setXpPop({ amount: xpAmount, correct, key: Date.now() });
      setTimeout(() => setXpPop(null), 1300);
      triggerXpEarned(xpAmount);

      setBuddyReaction(correct ? 'correct' : 'wrong');

      if (correct) {
        setRoundScore((s) => s + 1);
        correctCountRef.current += 1;
        setStreak((s) => {
          const next = s + 1;
          setBestStreak((b) => Math.max(b, next));
          return next;
        });
      } else {
        setStreak(0);
      }
      if (sessionIdRef.current) {
        await recordAnswer(sessionIdRef.current, correct, card.jlptLevel, card.id);
      }
    },
    [selected, card, recordAnswer, queue, triggerXpEarned],
  );

  const handleExit = async () => {
    if (sessionIdRef.current) {
      await endSession(sessionIdRef.current, {
        cardsStudied: totalAnsweredRef.current,
        cardsCorrect: correctCountRef.current,
        durationSecs: Math.round((Date.now() - startTimeRef.current) / 1000),
      });
    }
    onExit();
  };

  // End session when practice is fully complete
  useEffect(() => {
    if (queue.phase === 'allDone' && sessionIdRef.current) {
      endSession(sessionIdRef.current, {
        cardsStudied: totalAnsweredRef.current,
        cardsCorrect: correctCountRef.current,
        durationSecs: Math.round((Date.now() - startTimeRef.current) / 1000),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue.phase]);

  // ── Round transition screen ────────────────────────────────────────────────
  if (queue.phase === 'roundEnd') {
    return (
      <RoundTransition
        batchIndex={queue.batchIndex}
        totalBatches={queue.totalBatches}
        isRetryRound={queue.isRetryRound}
        wrongCount={queue.lastRoundWrong}
        totalInRound={queue.lastRoundTotal}
        willRetry={queue.willRetry}
        onContinue={queue.nextRound}
        onExit={handleExit}
      />
    );
  }

  // ── Completion screen ──────────────────────────────────────────────────────
  if (queue.phase === 'allDone') {
    const pct = queue.totalCards > 0 ? queue.firstAttemptCorrect / queue.totalCards : 0;
    const praise = pickPraise(pct);
    return (
      <CelebrationScreen
        heading={praise.jp}
        headingEn={praise.en}
        subheading={`${queue.firstAttemptCorrect} / ${queue.totalCards} correct`}
        extra={bestStreak >= 3 ? `🔥 Best streak: ${bestStreak} in a row!` : undefined}
        mode="recall"
        onExit={onExit}
      />
    );
  }

  // ── Quiz card ──────────────────────────────────────────────────────────────
  if (!card) return null;
  const display = getFlashcardDisplayText(card);
  const answeredCorrectly = selected === card.meaning;
  const answeredWrong = !!selected && !answeredCorrectly;

  return (
    <Box sx={{ position: 'relative' }}>
      {xpPop && <XpEarnedPop amount={xpPop.amount} correct={xpPop.correct} show />}
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Typography variant="h5">Guess It!</Typography>
          {queue.isRetryRound && (
            <Chip label="Review" size="small" color="warning" variant="outlined" />
          )}
          {streak >= 2 && (
            <Chip label={`🔥 ${streak}`} size="small" color="warning" sx={{ fontWeight: 700 }} />
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {queue.totalBatches > 1 && (
            <Chip
              label={`${queue.batchIndex + 1}/${queue.totalBatches}`}
              size="small"
              variant="outlined"
            />
          )}
          <Chip label={`${roundScore} / ${queue.currentCards.length}`} />
        </Box>
      </Box>

      <LinearProgress
        variant="determinate"
        value={(index / queue.currentCards.length) * 100}
        sx={{
          mb: 3,
          height: 8,
          borderRadius: 4,
          bgcolor: alpha(brand[300], 0.12),
          '& .MuiLinearProgress-bar': { bgcolor: 'primary.main', borderRadius: 4 },
        }}
      />

      {/* Word card */}
      <Box
        sx={{
          position: 'relative',
          border: '2px solid',
          borderColor: selected
            ? answeredCorrectly
              ? 'success.main'
              : 'error.main'
            : alpha(brand[300], 0.45),
          borderRadius: 3,
          overflow: 'hidden',
          mb: 3,
          boxShadow: `0 8px 24px ${alpha(brand[300], 0.12)}`,
          transition: 'border-color 0.25s',
        }}
      >
        {card.imageUrl && (
          <Box sx={{ position: 'relative' }}>
            <Box
              component="img"
              src={card.imageUrl}
              alt={card.word}
              sx={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }}
            />
            <UnsplashAttribution url={card.imageUrl} />
          </Box>
        )}
        <Box sx={{ p: 3, textAlign: 'center', bgcolor: surfaces.input }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
            <Typography
              sx={{
                fontFamily: (t) => t.fonts.jp,
                fontSize: '2.2rem',
                fontWeight: 700,
                color: 'text.primary',
                mb: 0.5,
              }}
            >
              {display.titleText}
            </Typography>
            <SpeakButton text={card.word} iconSize="1.4rem" sx={{ mb: 0.5 }} />
          </Box>
          {display.subtitleText && (
            <Typography variant="body1" color="text.secondary">
              {display.subtitleText}
            </Typography>
          )}
          {!card.imageUrl && card.example_jp && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.5,
                mt: 1,
              }}
            >
              <FuriganaText
                text={card.example_jp}
                showFurigana
                sx={{
                  color: 'text.secondary',
                  fontFamily: (t) => t.fonts.jp,
                  fontSize: '0.9rem',
                }}
              />
              <SpeakButton text={stripFurigana(card.example_jp)} iconSize="1.1rem" />
            </Box>
          )}
          {card.imageUrl && card.example_jp && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 0.5 }}>
              <SpeakButton text={stripFurigana(card.example_jp)} iconSize="1.1rem" />
            </Box>
          )}
          <Typography
            variant="caption"
            sx={{ color: 'text.secondary', letterSpacing: '0.12em', display: 'block', mt: 1.5 }}
          >
            WHAT DOES THIS MEAN?
          </Typography>
        </Box>
      </Box>

      {/* Answer choices */}
      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        {choices.map((choice, i) => {
          const isThisCorrect = choice === card.meaning;
          const isThisSelected = selected === choice;

          let borderColor: string = alpha(brand[200], 0.7);
          let bgcolor: string = surfaces.input;
          let textColor = 'text.primary';
          let iconEl: React.ReactNode = null;

          if (selected) {
            if (isThisCorrect) {
              borderColor = theme.palette.success.main;
              bgcolor = alpha(theme.palette.success.main, 0.1);
              textColor = 'success.dark';
              iconEl = <CheckIcon sx={{ color: 'success.main', flexShrink: 0 }} />;
            } else if (isThisSelected) {
              borderColor = theme.palette.error.main;
              bgcolor = alpha(theme.palette.error.main, 0.08);
              textColor = 'error.dark';
              iconEl = <CloseIcon sx={{ color: 'error.main', flexShrink: 0 }} />;
            }
          }

          return (
            <Grid size={{ xs: 12, sm: 6 }} key={choice}>
              <Box
                onClick={() => !selected && handleSelect(choice)}
                sx={{
                  p: 2,
                  border: '2px solid',
                  borderRadius: 2,
                  cursor: selected ? 'default' : 'pointer',
                  borderColor,
                  bgcolor,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  minHeight: 64,
                  transition: 'all 0.2s',
                  transform: selected && isThisCorrect ? 'scale(1.02)' : 'scale(1)',
                  '&:hover': !selected
                    ? {
                        borderColor: brand[500],
                        bgcolor: alpha(brand[300], 0.15),
                        transform: 'scale(1.02)',
                      }
                    : {},
                }}
              >
                {/* Circle label or result icon */}
                {selected ? (
                  (iconEl ?? (
                    <Box
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        border: `2px solid ${alpha(brand[300], 0.3)}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        opacity: 0.4,
                      }}
                    >
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>
                        {CHOICE_LABELS[i]}
                      </Typography>
                    </Box>
                  ))
                ) : (
                  <Box
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      border: `2px solid ${alpha(brand[300], 0.4)}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                      {CHOICE_LABELS[i]}
                    </Typography>
                  </Box>
                )}

                <Typography
                  sx={{
                    color: textColor,
                    fontWeight: isThisSelected || (!!selected && isThisCorrect) ? 600 : 400,
                    flexGrow: 1,
                  }}
                >
                  {choice}
                </Typography>
              </Box>
            </Grid>
          );
        })}
      </Grid>

      {/* On wrong: manual next; on correct: auto-advance hint */}
      {answeredWrong && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <Button variant="contained" onClick={next} size="large">
            {index + 1 >= queue.currentCards.length ? 'See Results' : 'Next →'}
          </Button>
        </Box>
      )}
      {answeredCorrectly && (
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <Typography variant="body2" color="success.main" sx={{ fontStyle: 'italic' }}>
            ✓ Correct — moving on…
          </Typography>
        </Box>
      )}

      <Box sx={{ mt: 2, textAlign: 'right' }}>
        <Button size="small" onClick={handleExit} sx={{ color: 'text.secondary' }}>
          Quit &amp; Save Progress
        </Button>
      </Box>

      {equippedBuddy && <StudyBuddy buddyKey={equippedBuddy} reaction={buddyReaction} />}
    </Box>
  );
}
