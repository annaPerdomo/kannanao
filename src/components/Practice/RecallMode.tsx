'use client';
import { Box, Button, Chip, LinearProgress, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import FuriganaText, { furiganaToKana } from '@/components/FuriganaText';
import { SpeakButton } from '@/components/SpeakButton';
import TitleFurigana from '@/components/TitleFurigana';
import { UnsplashAttribution } from '@/components/UnsplashAttribution';
import { useBuddyReaction } from '@/contexts/BuddyReactionContext';
import { useXpAnimation } from '@/contexts/XpAnimationContext';
import { useFuriganaMask } from '@/hooks/useFuriganaMask';
import { usePracticeQueue } from '@/hooks/usePracticeQueue';
import { useProgress, XP_PER_WRONG } from '@/hooks/useProgress';
import {
  buildMeaningChoices,
  cardXp,
  getFlashcardDisplayText,
  titleFontSize,
} from '@/lib/flashcardUtils';
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

/** Long enough to take in the image and example sentence revealed with the answer. */
const AUTO_ADVANCE_MS = 1800;

export function RecallMode({ cards, deckId, batchSize, onExit }: RecallModeProps) {
  const t = useTranslations('Practice.recallMode');
  const tCommon = useTranslations('Practice.common');
  const isFuriganaMasked = useFuriganaMask(cards);
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

      {/* Word card — takes the height the choices below don't need, so the
          answer image can appear without pushing anything off screen. Grow-only
          (`1 0 auto`): it clips its overflow, so shrinking would cut off the
          word rather than scroll the page. */}
      <Box
        sx={{
          position: 'relative',
          flex: '1 0 auto',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          border: '2px solid',
          borderColor: selected
            ? answeredCorrectly
              ? 'success.main'
              : 'error.main'
            : alpha(brand[300], 0.45),
          borderRadius: 3,
          overflow: 'hidden',
          mb: { xs: 1.5, sm: 2 },
          boxShadow: `0 8px 24px ${alpha(brand[300], 0.12)}`,
          transition: 'border-color 0.25s',
        }}
      >
        {/* Image and example sentence would give the meaning away, so they only
            appear after answering, as feedback that reinforces the word. The
            image fills what the card has left, down to a floor below which it
            reads as a smear rather than a picture. */}
        {selected && card.imageUrl && imageReady && (
          <Box sx={{ position: 'relative', flex: 1, minHeight: { xs: 120, sm: 160 } }}>
            <Box
              component="img"
              src={card.imageUrl}
              alt={card.word}
              sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
            <UnsplashAttribution url={card.imageUrl} />
          </Box>
        )}
        <Box
          sx={{
            flexShrink: 0,
            p: { xs: 1.5, sm: 2 },
            textAlign: 'center',
            bgcolor: surfaces.input,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
            <Typography
              sx={{
                fontFamily: (t) => t.fonts.jp,
                fontSize:
                  card.cardType === 'phrase'
                    ? { xs: '2.2rem', sm: '3rem' }
                    : {
                        xs: titleFontSize(display.titleText, 2.2, 1.1),
                        sm: titleFontSize(display.titleText, 3.2, 1.4),
                      },
                fontWeight: 700,
                color: 'text.primary',
                mb: 0.5,
                whiteSpace: card.cardType === 'phrase' ? undefined : 'nowrap',
              }}
            >
              {display.titleFurigana ? (
                <TitleFurigana markup={display.titleFurigana} masked={isFuriganaMasked(card.id)} />
              ) : (
                display.titleText
              )}
            </Typography>
            <SpeakButton
              text={display.speakText}
              iconSize="1.4rem"
              onSpeak={selected ? holdCard : undefined}
              sx={{ mb: 0.5 }}
            />
          </Box>
          {display.subtitleText && !display.titleFurigana && (
            <Typography variant="body1" color="text.secondary">
              {display.subtitleText}
            </Typography>
          )}
          {selected && card.example_jp && (
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
              <SpeakButton
                text={furiganaToKana(card.example_jp)}
                iconSize="1.1rem"
                onSpeak={holdCard}
              />
            </Box>
          )}
          {!selected && (
            <Typography
              variant="caption"
              sx={{ color: 'text.secondary', letterSpacing: '0.12em', display: 'block', mt: 1.5 }}
            >
              {t('whatDoesThisMean')}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Answer choices */}
      <Box sx={{ flexShrink: 0 }}>
        <ChoiceGrid
          choices={choices}
          correct={card.meaning}
          selected={selected}
          onSelect={handleSelect}
        />
      </Box>

      {(answeredWrong || holdForReplay) && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1, flexShrink: 0 }}>
          <Button variant="contained" onClick={next} size="large">
            {index + 1 >= queue.currentCards.length ? t('seeResults') : t('nextArrow')}
          </Button>
        </Box>
      )}
      {answeredCorrectly && !holdForReplay && (
        <Box sx={{ textAlign: 'center', mb: 1, flexShrink: 0 }}>
          <Typography variant="body2" color="success.main" sx={{ fontStyle: 'italic' }}>
            {tCommon('correctMovingOn')}
          </Typography>
        </Box>
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
