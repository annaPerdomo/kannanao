'use client';
import { Box, Button, Chip, LinearProgress, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import FuriganaText, { stripFurigana } from '@/components/FuriganaText';
import { SpeakButton } from '@/components/SpeakButton';
import { UnsplashAttribution } from '@/components/UnsplashAttribution';
import { useBuddyReaction } from '@/contexts/BuddyReactionContext';
import { useXpAnimation } from '@/contexts/XpAnimationContext';
import { usePracticeQueue } from '@/hooks/usePracticeQueue';
import { useProgress, XP_PER_WRONG } from '@/hooks/useProgress';
import { buildMeaningChoices, cardXp, getFlashcardDisplayText } from '@/lib/flashcardUtils';
import type { Flashcard } from '@/types/flashcard';

import { CelebrationScreen, pickPraise } from './CelebrationScreen';
import { ChoiceGrid } from './ChoiceGrid';
import { RoundTransition } from './RoundTransition';
import { XpEarnedPop } from './XpEarnedPop';

interface RecallModeProps {
  cards: Flashcard[];
  deckId: string;
  batchSize: number;
  onExit: () => void;
}

export function RecallMode({ cards, deckId, batchSize, onExit }: RecallModeProps) {
  const t = useTranslations('Practice.recallMode');
  const tCommon = useTranslations('Practice.common');
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

  const { triggerReaction } = useBuddyReaction();

  const { startSession, recordAnswer, endSession } = useProgress();
  // Stable per-session pick so the completion phrase doesn't flicker on re-render.
  const praiseSeed = useMemo(() => Math.floor(Math.random() * 1000), []);
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

  // Reset per-round state the moment a new round arrives — during render, not
  // in an effect. An effect reset left one render where `roundDone` was still
  // computed from the PREVIOUS round's index, and the finish effect below saw
  // it and ended the fresh retry round instantly with every card marked wrong.
  const [prevRoundKey, setPrevRoundKey] = useState(queue.roundKey);
  if (prevRoundKey !== queue.roundKey) {
    setPrevRoundKey(queue.roundKey);
    setIndex(0);
    setSelected(null);
    setRoundScore(0);
  }

  const card = queue.currentCards[index];
  const roundDone = index >= queue.currentCards.length;

  // Rebuild choices whenever the card changes
  useEffect(() => {
    if (card) setChoices(buildMeaningChoices(card, cards));
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
      const timer = setTimeout(next, 1200);
      return () => clearTimeout(timer);
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

      triggerReaction(correct ? 'correct' : 'wrong');

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
    [selected, card, recordAnswer, queue, triggerXpEarned, triggerReaction],
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
    const praise = pickPraise(pct, praiseSeed);
    return (
      <CelebrationScreen
        heading={praise.jp}
        headingEn={praise.en}
        subheading={tCommon('correctSummary', {
          correct: queue.firstAttemptCorrect,
          total: queue.totalCards,
        })}
        extra={bestStreak >= 3 ? tCommon('bestStreakRow', { count: bestStreak }) : undefined}
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
          {queue.totalBatches > 1 && (
            <Chip
              label={tCommon('batchChip', {
                current: queue.batchIndex + 1,
                total: queue.totalBatches,
              })}
              size="small"
              variant="outlined"
            />
          )}
          {queue.isRetryRound && (
            <Chip label={tCommon('reviewChip')} size="small" color="warning" variant="outlined" />
          )}
          {streak >= 2 && (
            <Chip label={`🔥 ${streak}`} size="small" color="warning" sx={{ fontWeight: 700 }} />
          )}
        </Box>
        <Chip label={`${roundScore} / ${queue.currentCards.length}`} />
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
            {t('whatDoesThisMean')}
          </Typography>
        </Box>
      </Box>

      {/* Answer choices */}
      <ChoiceGrid
        choices={choices}
        correct={card.meaning}
        selected={selected}
        onSelect={handleSelect}
      />

      {/* On wrong: manual next; on correct: auto-advance hint */}
      {answeredWrong && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <Button variant="contained" onClick={next} size="large">
            {index + 1 >= queue.currentCards.length ? t('seeResults') : t('nextArrow')}
          </Button>
        </Box>
      )}
      {answeredCorrectly && (
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <Typography variant="body2" color="success.main" sx={{ fontStyle: 'italic' }}>
            {tCommon('correctMovingOn')}
          </Typography>
        </Box>
      )}

      <Box sx={{ mt: 2, textAlign: 'right' }}>
        <Button size="small" onClick={handleExit} sx={{ color: 'text.secondary' }}>
          {tCommon('quitAndSave')}
        </Button>
      </Box>
    </Box>
  );
}
