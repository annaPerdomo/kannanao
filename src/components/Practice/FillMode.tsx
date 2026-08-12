'use client';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { Box, Button, Chip, LinearProgress, Stack, TextField, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useTheme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import FuriganaText, { furiganaToKana, stripFurigana } from '@/components/FuriganaText';
import { SpeakButton } from '@/components/SpeakButton';
import { UnsplashAttribution } from '@/components/UnsplashAttribution';
import { useBuddyReaction } from '@/contexts/BuddyReactionContext';
import { useXpAnimation } from '@/contexts/XpAnimationContext';
import { usePracticeQueue } from '@/hooks/usePracticeQueue';
import { useProgress, XP_PER_WRONG } from '@/hooks/useProgress';
import { cardXp, speakTextFor } from '@/lib/flashcardUtils';
import { hiraganaToKatakana } from '@/lib/reviewGames';
import type { Flashcard } from '@/types/flashcard';

import { CelebrationScreen, pickPraise } from './CelebrationScreen';
import { RoundTransition } from './RoundTransition';
import { XpEarnedPop } from './XpEarnedPop';

interface FillModeProps {
  cards: Flashcard[];
  deckId: string;
  batchSize: number;
  onExit: () => void;
}

export function maskWord(sentence: string, word: string, reading?: string): string {
  // Mask EVERY occurrence of both the word and its reading — .replace() only
  // masked the first, so a word appearing twice left the answer visible.
  let out = sentence;
  for (const target of [word, reading]) {
    if (target && out.includes(target)) out = out.split(target).join('＿'.repeat(target.length));
  }
  return out;
}

/**
 * Forgiving typed-answer comparison: strips ALL whitespace (incl. full-width
 * spaces from Japanese IMEs) from both sides and folds hiragana/katakana to one
 * script — typing チーズ for a card whose reading is stored ちーず is a correct
 * answer, not a spelling mistake.
 */
export function answerMatches(input: string, word: string, reading?: string | null): boolean {
  const fold = (s: string | undefined | null) =>
    hiraganaToKatakana((s ?? '').replace(/[\s　]+/g, ''));
  const typed = fold(input);
  return typed.length > 0 && (typed === fold(word) || (!!reading && typed === fold(reading)));
}

export function FillMode({ cards, deckId, batchSize, onExit }: FillModeProps) {
  const t = useTranslations('Practice.fillMode');
  const tCommon = useTranslations('Practice.common');
  const theme = useTheme();
  const { brand, surfaces } = theme.palette;

  const queue = usePracticeQueue(cards, batchSize);

  const [index, setIndex] = useState(0);
  const [input, setInput] = useState('');
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null);
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
    startSession(deckId, 'fill').then((id) => {
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
    setInput('');
    setResult(null);
    setRoundScore(0);
  }

  const card = queue.currentCards[index];
  const roundDone = index >= queue.currentCards.length;

  // When all cards in the round are answered, tell the queue
  useEffect(() => {
    if (roundDone && queue.phase === 'playing') {
      queue.finishRound();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundDone, queue.phase, queue.finishRound]);

  const next = useCallback(() => {
    setIndex((i) => i + 1);
    setInput('');
    setResult(null);
  }, []);

  // Auto-advance 1.5 s after a correct answer
  useEffect(() => {
    if (result === 'correct') {
      const timer = setTimeout(next, 1500);
      return () => clearTimeout(timer);
    }
  }, [result, next]);

  const check = async () => {
    const correct = answerMatches(input, card.word, card.reading);
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
        const next = s + 1;
        setBestStreak((b) => Math.max(b, next));
        return next;
      });
    } else {
      setStreak(0);
    }
    if (sessionIdRef.current)
      await recordAnswer(sessionIdRef.current, correct, card.jlptLevel, card.id);
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
        mode="fill"
        onExit={onExit}
      />
    );
  }

  // ── Fill card ──────────────────────────────────────────────────────────────
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

      {/* Card — takes the slack so the answer box below stays on screen.
          Grow-only (`1 0 auto`): it clips its overflow, so shrinking would cut
          off the sentence instead of scrolling. */}
      <Box
        sx={{
          position: 'relative',
          flex: '1 0 auto',
          display: 'flex',
          flexDirection: 'column',
          border: '2px solid',
          borderColor: result
            ? result === 'correct'
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
        {card.imageUrl && (
          <Box sx={{ position: 'relative', flex: 1, minHeight: { xs: 100, sm: 140 } }}>
            <Box
              component="img"
              src={card.imageUrl}
              alt={card.word}
              sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
            <UnsplashAttribution url={card.imageUrl} />
          </Box>
        )}

        <Box sx={{ flexShrink: 0, p: { xs: 2, sm: 2.5 }, bgcolor: surfaces.input }}>
          <Typography
            variant="caption"
            sx={{ color: 'primary.main', letterSpacing: '0.12em', display: 'block', mb: 1 }}
          >
            {t('fillPrompt')}
          </Typography>

          {/* Sentence with blank (or revealed after answer) */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, mb: 1 }}>
            <Typography
              component="div"
              sx={{
                fontFamily: (t) => t.fonts.jp,
                fontSize: '1.3rem',
                color: 'text.primary',
                lineHeight: 1.8,
                flexGrow: 1,
              }}
            >
              {result ? (
                <FuriganaText text={card.example_jp} showFurigana={card.mainViewMode !== 'kanji'} />
              ) : (
                maskWord(stripFurigana(card.example_jp), card.word, card.reading)
              )}
            </Typography>
            {result && (
              <SpeakButton
                text={furiganaToKana(card.example_jp)}
                iconSize="1.2rem"
                sx={{ mt: 0.5, flexShrink: 0 }}
              />
            )}
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            {card.example_en}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1 }}>
            {t('meaningLabel', { meaning: card.meaning })}
          </Typography>
        </Box>
      </Box>

      {/* Feedback row */}
      {result && (
        <Box
          sx={{
            p: 1.5,
            flexShrink: 0,
            borderRadius: 2,
            border: '1px solid',
            borderColor: result === 'correct' ? 'success.main' : 'error.main',
            bgcolor:
              result === 'correct'
                ? alpha(theme.palette.success.main, 0.1)
                : alpha(theme.palette.error.main, 0.08),
            mb: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          {result === 'correct' ? (
            <CheckIcon sx={{ color: 'success.main' }} />
          ) : (
            <CloseIcon sx={{ color: 'error.main' }} />
          )}
          <Typography
            variant="body2"
            color={result === 'correct' ? 'success.main' : 'error.main'}
            sx={{ flexGrow: 1 }}
          >
            {result === 'correct'
              ? tCommon('correctMovingOn')
              : card.reading !== card.word
                ? t('incorrectAnswerWithReading', { word: card.word, reading: card.reading })
                : t('incorrectAnswer', { word: card.word })}
          </Typography>
          <SpeakButton text={speakTextFor(card)} iconSize="1.1rem" />
        </Box>
      )}

      {/* Input row */}
      <Stack direction="row" spacing={1.5} alignItems="flex-end" sx={{ flexShrink: 0 }}>
        <TextField
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !result) check();
          }}
          label={t('answerLabel')}
          placeholder={t('answerPlaceholder')}
          disabled={!!result}
          fullWidth
          size="small"
          autoFocus
        />
        {!result ? (
          <Button
            variant="contained"
            onClick={check}
            disabled={!input.trim()}
            sx={{ flexShrink: 0 }}
          >
            {t('check')}
          </Button>
        ) : result === 'wrong' ? (
          <Button variant="outlined" onClick={next} sx={{ flexShrink: 0 }}>
            {tCommon('next')}
          </Button>
        ) : null}
      </Stack>

      {/* Left, not right: the floating buddy parks over the bottom-right corner. */}
      <Box sx={{ mt: { xs: 0.5, sm: 1 }, flexShrink: 0, textAlign: 'left' }}>
        <Button size="small" onClick={handleExit} sx={{ color: 'text.secondary' }}>
          {tCommon('quitAndSave')}
        </Button>
      </Box>
    </Box>
  );
}
