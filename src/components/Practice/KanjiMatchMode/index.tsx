'use client';
import { Box, Button, Chip, LinearProgress } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Loading } from '@/components/Loading';
import { type MatchRoundProgress, PairBoard, PAIRS_PER_ROUND } from '@/components/MatchPairs';
import { useBuddyReaction } from '@/contexts/BuddyReactionContext';
import { useXpAnimation } from '@/contexts/XpAnimationContext';
import { useProgress, XP_PER_WRONG } from '@/hooks/useProgress';
import { sampleBuddyWords } from '@/lib/buddyWords';
import { cardXp } from '@/lib/flashcardUtils';
import type { Flashcard } from '@/types/flashcard';

import { CelebrationScreen, pickPraise } from '../CelebrationScreen';
import { XpEarnedPop } from '../XpEarnedPop';
import { type KanjiMatchPair, kanjiMatchPairs } from './pairs';
import { useCardStrengths } from './useCardStrengths';

export type { KanjiMatchPair } from './pairs';
export { kanjiMatchPairs } from './pairs';

interface KanjiMatchModeProps {
  cards: Flashcard[];
  deckId: string;
  batchSize: number;
  onExit: () => void;
}

export function KanjiMatchMode({ cards, deckId, batchSize, onExit }: KanjiMatchModeProps) {
  const { brand } = useTheme().palette;
  const tCommon = useTranslations('Practice.common');

  const strengths = useCardStrengths(cards);
  // Frozen once the SRS snapshot lands: re-ordering mid-session would redeal
  // the board under the learner's hand.
  const [pairs, setPairs] = useState<KanjiMatchPair[] | null>(null);
  useEffect(() => {
    if (!strengths || pairs) return;
    setPairs(kanjiMatchPairs(cards, (cardId) => strengths.get(cardId) ?? 'new', batchSize));
  }, [strengths, pairs, cards, batchSize]);

  const [progress, setProgress] = useState<MatchRoundProgress>({ index: 0, total: 1 });
  const [matchedInRound, setMatchedInRound] = useState(0);
  const [done, setDone] = useState(false);
  const [xpPop, setXpPop] = useState<{ amount: number; correct: boolean; key: number } | null>(
    null,
  );

  const { triggerReaction, markMissed } = useBuddyReaction();
  const { triggerXpEarned } = useXpAnimation();
  const { startSession, recordAnswer, endSession } = useProgress();
  const praiseSeed = useMemo(() => Math.floor(Math.random() * 1000), []);
  const sessionIdRef = useRef<string>('');
  const startTimeRef = useRef<number>(Date.now());
  const correctRef = useRef(0);
  const answeredRef = useRef(0);
  const finishedRef = useRef(false);

  useEffect(() => {
    startSession(deckId, 'kanji-match').then((id) => {
      sessionIdRef.current = id;
      startTimeRef.current = Date.now();
    });
  }, [deckId, startSession]);

  const studiedCards = useCallback(
    () => cards.filter((card) => pairs?.some((pair) => pair.cardId === card.id)),
    [cards, pairs],
  );

  const close = useCallback(async () => {
    if (finishedRef.current || !sessionIdRef.current) return;
    finishedRef.current = true;
    await endSession(sessionIdRef.current, {
      cardsStudied: answeredRef.current,
      cardsCorrect: correctRef.current,
      durationSecs: Math.round((Date.now() - startTimeRef.current) / 1000),
      sampleWords: sampleBuddyWords(studiedCards()),
    });
  }, [endSession, studiedCards]);

  const handleGrade = useCallback(
    (correct: boolean, pair: KanjiMatchPair | undefined) => {
      answeredRef.current += 1;
      if (correct) {
        correctRef.current += 1;
        setMatchedInRound((n) => n + 1);
      }
      if (pair) {
        triggerReaction(correct ? 'correct' : 'wrong', pair.cardId);
        if (!correct) markMissed(pair.cardId);
      }
      const amount = correct ? cardXp(pair?.jlpt) : XP_PER_WRONG;
      setXpPop({ amount, correct, key: Date.now() });
      setTimeout(() => setXpPop(null), 1300);
      triggerXpEarned(amount);
      if (sessionIdRef.current) {
        void recordAnswer(sessionIdRef.current, correct, pair?.jlpt, pair?.cardId);
      }
    },
    [markMissed, recordAnswer, triggerReaction, triggerXpEarned],
  );

  const handleRound = useCallback((next: MatchRoundProgress) => {
    setProgress(next);
    setMatchedInRound(0);
  }, []);

  const handleComplete = useCallback(() => {
    setDone(true);
    void close();
  }, [close]);

  const handleExit = useCallback(async () => {
    await close();
    onExit();
  }, [close, onExit]);

  if (!pairs) return <Loading />;

  if (done) {
    const pct = answeredRef.current > 0 ? correctRef.current / answeredRef.current : 1;
    const praise = pickPraise(pct, praiseSeed);
    return (
      <CelebrationScreen
        heading={praise.jp}
        headingEn={praise.en}
        subheading={tCommon('correctSummary', {
          correct: correctRef.current,
          total: answeredRef.current,
        })}
        mode="kanji-match"
        onExit={onExit}
      />
    );
  }

  const roundSize = Math.min(PAIRS_PER_ROUND, pairs.length - progress.index * PAIRS_PER_ROUND);
  const overall =
    progress.total > 0
      ? (progress.index + matchedInRound / Math.max(1, roundSize)) / progress.total
      : 0;

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      {xpPop && <XpEarnedPop amount={xpPop.amount} correct={xpPop.correct} show />}

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: { xs: 1, sm: 1.5 },
          flexShrink: 0,
        }}
      >
        {progress.total > 1 ? (
          <Chip
            label={tCommon('batchChip', { current: progress.index + 1, total: progress.total })}
            size="small"
            variant="outlined"
          />
        ) : (
          <Box />
        )}
        <Chip label={`${matchedInRound} / ${roundSize}`} />
      </Box>

      <LinearProgress
        variant="determinate"
        value={overall * 100}
        sx={{
          mb: { xs: 1.5, sm: 2 },
          flexShrink: 0,
          height: 8,
          borderRadius: 4,
          bgcolor: alpha(brand[300], 0.12),
          '& .MuiLinearProgress-bar': { bgcolor: 'primary.main', borderRadius: 4 },
        }}
      />

      <PairBoard<KanjiMatchPair>
        pairs={pairs}
        variant="japanese"
        onGrade={handleGrade}
        onComplete={handleComplete}
        onProgress={handleRound}
      />

      {/* Left, not right: the floating buddy parks over the bottom-right corner. */}
      <Box sx={{ mt: { xs: 1, sm: 1.5 }, flexShrink: 0, textAlign: 'left' }}>
        <Button size="small" color="inherit" onClick={handleExit} sx={{ opacity: 0.5 }}>
          {tCommon('quitAndSave')}
        </Button>
      </Box>
    </Box>
  );
}
