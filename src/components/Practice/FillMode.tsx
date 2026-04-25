'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  LinearProgress,
  Chip,
  Stack,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useTheme } from '@mui/material/styles';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import type { Flashcard } from '@/types/flashcard';
import { cardXp } from '@/lib/flashcardUtils';
import { useProgress, XP_PER_WRONG } from '@/hooks/useProgress';
import { usePracticeQueue } from '@/hooks/usePracticeQueue';
import { useXpAnimation } from '@/contexts/XpAnimationContext';
import FuriganaText, { stripFurigana } from '@/components/FuriganaText';
import { CelebrationScreen } from './CelebrationScreen';
import { RoundTransition } from './RoundTransition';
import { XpEarnedPop } from './XpEarnedPop';
import { StudyBuddy, type BuddyReaction } from '@/components/StudyBuddy';
import { useShop } from '@/hooks/useShop';
import { UnsplashAttribution } from '@/components/UnsplashAttribution';
import { SpeakButton } from '@/components/SpeakButton';

interface FillModeProps {
  cards: Flashcard[];
  deckId: string;
  batchSize: number;
  onExit: () => void;
}

function maskWord(sentence: string, word: string, reading?: string): string {
  if (sentence.includes(word)) return sentence.replace(word, '＿'.repeat(word.length));
  const target = reading || word;
  if (target && sentence.includes(target)) return sentence.replace(target, '＿'.repeat(target.length));
  return sentence;
}

export function FillMode({ cards, deckId, batchSize, onExit }: FillModeProps) {
  const theme = useTheme();
  const { brand, surfaces } = theme.palette;

  const queue = usePracticeQueue(cards, batchSize);

  const [index, setIndex] = useState(0);
  const [input, setInput] = useState('');
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null);
  const [roundScore, setRoundScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [xpPop, setXpPop] = useState<{ amount: number; correct: boolean; key: number } | null>(null);

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
    startSession(deckId, 'fill').then((id) => {
      sessionIdRef.current = id;
      startTimeRef.current = Date.now();
    });
  }, [deckId, startSession]);

  // Reset per-round state when a new round starts
  useEffect(() => {
    if (queue.roundKey === 0) return;
    setIndex(0);
    setInput('');
    setResult(null);
    setRoundScore(0);
  }, [queue.roundKey]);

  const card = queue.currentCards[index];
  const roundDone = index >= queue.currentCards.length;

  // When all cards in the round are answered, tell the queue
  useEffect(() => {
    if (roundDone && queue.phase === 'playing') {
      queue.finishRound();
    }
  }, [roundDone, queue.phase, queue.finishRound]);

  const next = useCallback(() => {
    setIndex((i) => i + 1);
    setInput('');
    setResult(null);
  }, []);

  // Auto-advance 1.5 s after a correct answer
  useEffect(() => {
    if (result === 'correct') {
      const t = setTimeout(next, 1500);
      return () => clearTimeout(t);
    }
  }, [result, next]);

  const check = async () => {
    const correct = input.trim() === card.word || input.trim() === card.reading;
    setResult(correct ? 'correct' : 'wrong');
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
    if (sessionIdRef.current) await recordAnswer(sessionIdRef.current, correct, card.jlptLevel);
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
    const heading = pct === 1 ? 'Perfect!' : pct >= 0.7 ? 'Great job!' : 'Keep going!';
    return (
      <CelebrationScreen
        heading={heading}
        subheading={`${queue.firstAttemptCorrect} / ${queue.totalCards} correct`}
        extra={bestStreak >= 3 ? `🔥 Best streak: ${bestStreak} in a row!` : undefined}
        mode="fill"
        onExit={onExit}
      />
    );
  }

  // ── Fill card ──────────────────────────────────────────────────────────────
  return (
    <Box sx={{ position: 'relative' }}>
      {xpPop && <XpEarnedPop amount={xpPop.amount} correct={xpPop.correct} show />}
      {/* Header */}
      <Box
        sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Typography variant="h5">Fill in the Blank</Typography>
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

      {/* Card */}
      <Box
        sx={{
          position: 'relative',
          border: '2px solid',
          borderColor: result
            ? result === 'correct'
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
        {/* Card image */}
        {card.imageUrl && (
          <Box sx={{ position: 'relative' }}>
            <Box
              component="img"
              src={card.imageUrl}
              alt={card.word}
              sx={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }}
            />
            <UnsplashAttribution url={card.imageUrl} />
          </Box>
        )}

        <Box sx={{ p: 3, bgcolor: surfaces.input }}>
          <Typography
            variant="caption"
            sx={{ color: 'primary.main', letterSpacing: '0.12em', display: 'block', mb: 2 }}
          >
            FILL IN THE BLANK
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
                <FuriganaText
                  text={card.example_jp}
                  showFurigana={card.mainViewMode === 'hiragana'}
                />
              ) : (
                maskWord(stripFurigana(card.example_jp), card.word, card.reading)
              )}
            </Typography>
            {result && (
              <SpeakButton
                text={stripFurigana(card.example_jp)}
                iconSize="1.2rem"
                sx={{ mt: 0.5, flexShrink: 0 }}
              />
            )}
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            {card.example_en}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1 }}>
            Meaning: {card.meaning}
          </Typography>
        </Box>
      </Box>

      {/* Feedback row */}
      {result && (
        <Box
          sx={{
            p: 2,
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
              ? '✓ Correct — moving on…'
              : `Incorrect — answer: ${card.word}${card.reading !== card.word ? ` (${card.reading})` : ''}`}
          </Typography>
          <SpeakButton text={card.word} iconSize="1.1rem" />
        </Box>
      )}

      {/* Input row */}
      <Stack direction="row" spacing={1.5} alignItems="flex-end">
        <TextField
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !result) check();
          }}
          label="Your answer"
          placeholder="Word or reading…"
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
            Check
          </Button>
        ) : result === 'wrong' ? (
          <Button variant="outlined" onClick={next} sx={{ flexShrink: 0 }}>
            Next
          </Button>
        ) : null}
      </Stack>

      <Box sx={{ mt: 3, textAlign: 'right' }}>
        <Button size="small" color="inherit" onClick={handleExit} sx={{ opacity: 0.5 }}>
          Quit &amp; Save Progress
        </Button>
      </Box>

      {equippedBuddy && <StudyBuddy buddyKey={equippedBuddy} reaction={buddyReaction} />}
    </Box>
  );
}
