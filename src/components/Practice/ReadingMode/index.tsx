'use client';
import KeyboardAltOutlinedIcon from '@mui/icons-material/KeyboardAltOutlined';
import ViewModuleOutlinedIcon from '@mui/icons-material/ViewModuleOutlined';
import { Box, Button, Chip, LinearProgress } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useBuddyReaction } from '@/contexts/BuddyReactionContext';
import { useXpAnimation } from '@/contexts/XpAnimationContext';
import { usePracticeQueue } from '@/hooks/usePracticeQueue';
import { useProgress, XP_PER_WRONG } from '@/hooks/useProgress';
import { cardXp } from '@/lib/flashcardUtils';
import type { Flashcard } from '@/types/flashcard';

import { CelebrationScreen, pickPraise } from '../CelebrationScreen';
import { answerMatches } from '../FillMode';
import { RoundTransition } from '../RoundTransition';
import { XpEarnedPop } from '../XpEarnedPop';
import { loadInputMode, type ReadingInputMode, saveInputMode } from './inputMode';
import { ReadingPrompt } from './ReadingPrompt';
import { TileAnswer } from './TileAnswer';
import { TypedAnswer } from './TypedAnswer';

export { eligibleReadingCards, isReadingCard, MIN_READING_CARDS } from './eligibility';

interface ReadingModeProps {
  cards: Flashcard[];
  deckId: string;
  batchSize: number;
  onExit: () => void;
}

export function ReadingMode({ cards, deckId, batchSize, onExit }: ReadingModeProps) {
  const { brand } = useTheme().palette;
  const t = useTranslations('Practice.readingMode');
  const tCommon = useTranslations('Practice.common');

  const queue = usePracticeQueue(cards, batchSize);

  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null);
  const [inputMode, setInputMode] = useState<ReadingInputMode>('tiles');
  const [roundScore, setRoundScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [xpPop, setXpPop] = useState<{ amount: number; correct: boolean; key: number } | null>(
    null,
  );

  const { triggerReaction } = useBuddyReaction();
  const { startSession, recordAnswer, endSession } = useProgress();
  const { triggerXpEarned } = useXpAnimation();
  const praiseSeed = useMemo(() => Math.floor(Math.random() * 1000), []);
  const sessionIdRef = useRef<string>('');
  const startTimeRef = useRef<number>(Date.now());
  const correctCountRef = useRef(0);
  const totalAnsweredRef = useRef(0);

  useEffect(() => setInputMode(loadInputMode()), []);

  useEffect(() => {
    startSession(deckId, 'reading').then((id) => {
      sessionIdRef.current = id;
      startTimeRef.current = Date.now();
    });
  }, [deckId, startSession]);

  // Reset per-round state during render, not in an effect: an effect left one
  // render where `roundDone` still came from the previous round's index, which
  // ended the fresh retry round instantly with every card marked wrong.
  const [prevRoundKey, setPrevRoundKey] = useState(queue.roundKey);
  if (prevRoundKey !== queue.roundKey) {
    setPrevRoundKey(queue.roundKey);
    setIndex(0);
    setResult(null);
    setRoundScore(0);
  }

  const card = queue.currentCards[index];
  const roundDone = index >= queue.currentCards.length;

  useEffect(() => {
    if (roundDone && queue.phase === 'playing') {
      queue.finishRound();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundDone, queue.phase, queue.finishRound]);

  const next = useCallback(() => {
    setIndex((i) => i + 1);
    setResult(null);
  }, []);

  useEffect(() => {
    if (result === 'correct') {
      const timer = setTimeout(next, 1500);
      return () => clearTimeout(timer);
    }
  }, [result, next]);

  const submit = async (guess: string) => {
    if (result || !card) return;
    const correct = answerMatches(guess, card.reading);
    setResult(correct ? 'correct' : 'wrong');
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
        const nextStreak = s + 1;
        setBestStreak((b) => Math.max(b, nextStreak));
        return nextStreak;
      });
    } else {
      setStreak(0);
    }
    if (sessionIdRef.current)
      await recordAnswer(sessionIdRef.current, correct, card.jlptLevel, card.id);
  };

  const toggleInput = () => {
    const nextMode: ReadingInputMode = inputMode === 'tiles' ? 'typed' : 'tiles';
    setInputMode(nextMode);
    saveInputMode(nextMode);
  };

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
        mode="reading"
        onExit={onExit}
      />
    );
  }

  if (!card) return null;

  return (
    <Box sx={{ position: 'relative' }}>
      {xpPop && <XpEarnedPop amount={xpPop.amount} correct={xpPop.correct} show />}

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: { xs: 1, sm: 2 },
        }}
      >
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
          mb: { xs: 2, sm: 3 },
          height: 8,
          borderRadius: 4,
          bgcolor: alpha(brand[300], 0.12),
          '& .MuiLinearProgress-bar': { bgcolor: 'primary.main', borderRadius: 4 },
        }}
      />

      <ReadingPrompt card={card} result={result} />

      {/* Answer area — tiles by default, typing for anyone who prefers it */}
      {inputMode === 'tiles' ? (
        <TileAnswer
          key={`${queue.roundKey}-${index}`}
          target={card.reading}
          locked={!!result}
          onSubmit={submit}
        />
      ) : (
        <TypedAnswer key={`${queue.roundKey}-${index}`} locked={!!result} onSubmit={submit} />
      )}

      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2.5 }}>
        <Button
          size="small"
          onClick={toggleInput}
          startIcon={
            inputMode === 'tiles' ? <KeyboardAltOutlinedIcon /> : <ViewModuleOutlinedIcon />
          }
          sx={{ color: 'text.secondary' }}
        >
          {inputMode === 'tiles' ? t('switchToTyping') : t('switchToTiles')}
        </Button>
      </Box>

      {result === 'wrong' && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Button variant="contained" onClick={next} size="large">
            {index + 1 >= queue.currentCards.length ? t('seeResults') : tCommon('next')}
          </Button>
        </Box>
      )}

      {/* Left on a phone: the floating buddy parks in the right-hand corner. */}
      <Box sx={{ mt: { xs: 1, sm: 2 }, textAlign: { xs: 'left', sm: 'right' } }}>
        <Button size="small" onClick={handleExit} sx={{ color: 'text.secondary' }}>
          {tCommon('quitAndSave')}
        </Button>
      </Box>
    </Box>
  );
}
