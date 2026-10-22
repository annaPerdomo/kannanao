'use client';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import { alpha, useTheme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useBuddyReaction } from '@/contexts/BuddyReactionContext';
import { useXpAnimation } from '@/contexts/XpAnimationContext';
import { usePracticeQueue } from '@/hooks/usePracticeQueue';
import { useProgress, XP_PER_WRONG } from '@/hooks/useProgress';
import { sampleBuddyWords } from '@/lib/buddyWords';
import { cardXp } from '@/lib/flashcardUtils';
import {
  endingChoices,
  type EndingItem,
  endingItems,
  FAMILY_ENDINGS,
  isIiStem,
} from '@/lib/grammarEndings';
import type { Flashcard } from '@/types/flashcard';

import { CelebrationScreen, pickPraise } from '../CelebrationScreen';
import { MissExplainer } from '../MissExplainer';
import { RoundTransition } from '../RoundTransition';
import { XpEarnedPop } from '../XpEarnedPop';
import { EndingsPrompt } from './EndingsPrompt';

interface EndingsModeProps {
  cards: Flashcard[];
  deckId: string;
  batchSize: number;
  onExit: () => void;
}

/** Long enough to read the filled-in ending before the next card appears. */
const AUTO_ADVANCE_MS = 1800;

function ruleFor(t: ReturnType<typeof useTranslations>, item: EndingItem): string {
  const base = t(`rules.${item.family}.${item.form}`);
  return isIiStem(item) ? `${base} ${t('ii')}` : base;
}

export function EndingsMode({ cards, deckId, batchSize, onExit }: EndingsModeProps) {
  const tCommon = useTranslations('Practice.common');
  const t = useTranslations('Practice.endings');
  const theme = useTheme();
  const { brand } = theme.palette;

  const items = useMemo(() => endingItems(cards), [cards]);
  const itemByCardId = useMemo(() => new Map(items.map((i) => [i.card.id, i])), [items]);
  const itemCards = useMemo(() => items.map((i) => i.card), [items]);

  const queue = usePracticeQueue(itemCards, batchSize);

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [roundScore, setRoundScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [xpPop, setXpPop] = useState<{ amount: number; correct: boolean; key: number } | null>(
    null,
  );

  const { triggerReaction } = useBuddyReaction();
  const { startSession, recordAnswer, endSession } = useProgress();
  const praiseSeed = useMemo(() => Math.floor(Math.random() * 1000), []);
  const { triggerXpEarned } = useXpAnimation();
  const sessionIdRef = useRef<string>('');
  const startTimeRef = useRef<number>(Date.now());
  const correctCountRef = useRef(0);
  const totalAnsweredRef = useRef(0);

  useEffect(() => {
    startSession(deckId, 'endings').then((id) => {
      sessionIdRef.current = id;
      startTimeRef.current = Date.now();
    });
  }, [deckId, startSession]);

  // See RecallMode: reset per-round state the moment a new round arrives,
  // during render rather than in an effect, so a stale `roundDone` can't end a
  // fresh retry round instantly.
  const [prevRoundKey, setPrevRoundKey] = useState(queue.roundKey);
  if (prevRoundKey !== queue.roundKey) {
    setPrevRoundKey(queue.roundKey);
    setIndex(0);
    setSelected(null);
    setRoundScore(0);
  }

  const card = queue.currentCards[index];
  const item = card ? itemByCardId.get(card.id) : undefined;
  const roundDone = index >= queue.currentCards.length;

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

  const correctText = item ? FAMILY_ENDINGS[item.family][item.form] : null;

  useEffect(() => {
    if (selected && correctText && selected === correctText) {
      const timer = setTimeout(next, AUTO_ADVANCE_MS);
      return () => clearTimeout(timer);
    }
  }, [selected, correctText, next]);

  const handleSelect = useCallback(
    async (choice: string) => {
      if (selected || !card || !item || !correctText) return;
      setSelected(choice);
      const correct = choice === correctText;
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
        // Only a drill card's own review schedule moves on this answer.
        await recordAnswer(
          sessionIdRef.current,
          correct,
          card.jlptLevel,
          item.drillsCard ? card.id : undefined,
        );
      }
    },
    [selected, card, item, correctText, recordAnswer, queue, triggerXpEarned, triggerReaction],
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
        mode="endings"
        onExit={onExit}
      />
    );
  }

  if (!card || !item || !correctText) return null;
  const answeredWrong = !!selected && selected !== correctText;

  return (
    <Box sx={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
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
        <MissExplainer
          card={card}
          rule={ruleFor(t, item)}
          imageUrl={card.imageUrl}
          onContinue={next}
        />
      ) : (
        <EndingsPrompt
          item={item}
          choices={endingChoices(item).map((c) => c.text)}
          correctText={correctText}
          selected={selected}
          onSelect={handleSelect}
        />
      )}

      <Box sx={{ mt: { xs: 0.5, sm: 1 }, flexShrink: 0, textAlign: 'left' }}>
        <Button size="small" onClick={handleExit} sx={{ color: 'text.secondary' }}>
          {tCommon('quitAndSave')}
        </Button>
      </Box>
    </Box>
  );
}
