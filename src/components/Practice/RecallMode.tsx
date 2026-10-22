'use client';
import { Box, Button, Chip, LinearProgress } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useBuddyReaction } from '@/contexts/BuddyReactionContext';
import { useXpAnimation } from '@/contexts/XpAnimationContext';
import { useFuriganaMask } from '@/hooks/useFuriganaMask';
import { usePracticeQueue } from '@/hooks/usePracticeQueue';
import { useProgress, XP_PER_WRONG } from '@/hooks/useProgress';
import { sampleBuddyWords } from '@/lib/buddyWords';
import { buildMeaningChoices, cardXp } from '@/lib/flashcardUtils';
import type { Flashcard } from '@/types/flashcard';

import { CelebrationScreen, pickPraise } from './CelebrationScreen';
import { MissExplainer } from './MissExplainer';
import { RecallPrompt } from './RecallPrompt';
import { RoundTransition } from './RoundTransition';
import { XpEarnedPop } from './XpEarnedPop';

interface RecallModeProps {
  cards: Flashcard[];
  deckId: string;
  batchSize: number;
  onExit: () => void;
}

/** Long enough to take in the image and example sentence revealed with the answer. */
const AUTO_ADVANCE_MS = 1800;

export function RecallMode({ cards, deckId, batchSize, onExit }: RecallModeProps) {
  const tCommon = useTranslations('Practice.common');
  const isFuriganaMasked = useFuriganaMask(cards);
  const theme = useTheme();
  const { brand } = theme.palette;

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
  const [imageReady, setImageReady] = useState(false);
  const [holdForReplay, setHoldForReplay] = useState(false);

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
    setHoldForReplay(false);
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

  // Fetch the answer image while the learner is still choosing, and only reveal
  // it once it has loaded. Mounting it at reveal time meant the fetch started
  // with under two seconds left, so on a slow connection the card advanced past
  // an empty 200px slot before the image ever painted.
  useEffect(() => {
    setImageReady(false);
    if (!card?.imageUrl) return;
    const preload = new Image();
    preload.onload = () => setImageReady(true);
    preload.src = card.imageUrl;
    return () => {
      preload.onload = null;
    };
  }, [card?.imageUrl]);

  const next = useCallback(() => {
    setIndex((i) => i + 1);
    setSelected(null);
    setHoldForReplay(false);
  }, []);

  useEffect(() => {
    if (holdForReplay) return;
    if (selected && card && selected === card.meaning) {
      const timer = setTimeout(next, AUTO_ADVANCE_MS);
      return () => clearTimeout(timer);
    }
  }, [selected, card, next, holdForReplay]);

  // Tapping a speaker in the revealed answer stops the clock and swaps in a Next
  // button — otherwise the card advances mid-utterance and the audio carries
  // over the following prompt.
  const holdCard = useCallback(() => setHoldForReplay(true), []);

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

      triggerReaction(correct ? 'correct' : 'wrong', card.id);

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
        sampleWords: sampleBuddyWords(queue.studiedCards()),
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
        sampleWords: sampleBuddyWords(queue.studiedCards()),
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
  const answeredWrong = !!selected && selected !== card.meaning;

  return (
    <Box
      sx={{
        position: 'relative',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {xpPop && <XpEarnedPop amount={xpPop.amount} correct={xpPop.correct} show />}
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: { xs: 1, sm: 1.5 },
          flexShrink: 0,
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
          mb: { xs: 1.5, sm: 2 },
          flexShrink: 0,
          height: 8,
          borderRadius: 4,
          bgcolor: alpha(brand[300], 0.12),
          '& .MuiLinearProgress-bar': { bgcolor: 'primary.main', borderRadius: 4 },
        }}
      />

      {answeredWrong ? (
        <MissExplainer card={card} imageUrl={card.imageUrl} onContinue={next} />
      ) : (
        <RecallPrompt
          card={card}
          choices={choices}
          selected={selected}
          masked={isFuriganaMasked(card.id)}
          imageReady={imageReady}
          holdForReplay={holdForReplay}
          isLast={index + 1 >= queue.currentCards.length}
          onSelect={handleSelect}
          onSpeak={holdCard}
          onNext={next}
        />
      )}

      {/* Left, not right: the floating buddy parks over the bottom-right corner. */}
      <Box sx={{ mt: { xs: 0.5, sm: 1 }, flexShrink: 0, textAlign: 'left' }}>
        <Button size="small" onClick={handleExit} sx={{ color: 'text.secondary' }}>
          {tCommon('quitAndSave')}
        </Button>
      </Box>
    </Box>
  );
}
