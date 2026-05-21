'use client';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import { Alert, Box, Button, LinearProgress, Paper, Stack, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { stripFurigana } from '@/components/FuriganaText';
import { Loading } from '@/components/Loading';
import { SpeakButton } from '@/components/SpeakButton';
import { useAuth } from '@/contexts/AuthContext';
import { useXpAnimation } from '@/contexts/XpAnimationContext';
import { usePracticeSentences } from '@/hooks/usePracticeSentences';
import { useProgress } from '@/hooks/useProgress';
import type { Flashcard } from '@/types/flashcard';
import type { PracticeSentence } from '@/types/practiceSentence';

import { CelebrationScreen } from '../CelebrationScreen';
import { XpEarnedPop } from '../XpEarnedPop';
import { BubbleButton } from './BubbleButton';
import {
  MAX_LIVES,
  MIN_SENTENCES,
  PARTICLE_HINTS,
  XP_CORRECT,
  XP_PERFECT_BONUS,
  XP_WRONG,
} from './constants';
import { SentenceDisplay } from './SentenceDisplay';

interface KotobaBubbleModeProps {
  cards: Flashcard[];
  deckId: string;
  batchSize: number;
  onExit: () => void;
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildOptions(sentence: PracticeSentence): string[] {
  const all = [sentence.targetParticle, ...sentence.distractors];
  return shuffleArray([...new Set(all)]);
}

export function KotobaBubbleMode({ cards, deckId, batchSize, onExit }: KotobaBubbleModeProps) {
  const theme = useTheme();
  const { brand, accent } = theme.palette;
  const { isMemberAccount } = useAuth();

  const { sentences, loading, generating, error, hasContent, generate } =
    usePracticeSentences(deckId);

  // Determine furigana display based on first card's mainViewMode
  const showFurigana = useMemo(() => cards[0]?.mainViewMode !== 'kanji', [cards]);

  // Collect deck vocabulary words for highlighting in sentences
  const deckWords = useMemo(
    () => cards.flatMap((c) => [c.word, c.reading].filter(Boolean)),
    [cards],
  );

  // Filter to sentences that actually contain deck words, then shuffle for game
  const gameSentences = useMemo(() => {
    if (!hasContent) return [];
    const withDeckWords = sentences.filter((s) => {
      const plain = stripFurigana(s.sentenceJp);
      return deckWords.some((w) => w && plain.includes(w));
    });
    const pool = withDeckWords.length >= MIN_SENTENCES ? withDeckWords : sentences;
    const shuffled = shuffleArray(pool);
    return shuffled.slice(0, Math.min(batchSize, shuffled.length));
  }, [sentences, hasContent, batchSize, deckWords]);

  // Game state
  const [index, setIndex] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [xpPop, setXpPop] = useState<{ amount: number; correct: boolean; key: number } | null>(
    null,
  );

  // Session tracking
  const { startSession, recordAnswer, endSession } = useProgress();
  const { triggerXpEarned } = useXpAnimation();
  const sessionIdRef = useRef<string>('');
  const startTimeRef = useRef(Date.now());

  // Start session when game begins
  useEffect(() => {
    if (gameSentences.length >= MIN_SENTENCES) {
      startSession(deckId, 'kotoba-bubble').then((id) => {
        sessionIdRef.current = id;
        startTimeRef.current = Date.now();
      });
    }
  }, [deckId, startSession, gameSentences.length]);

  // Build options when sentence changes
  const currentSentence = gameSentences[index];
  useEffect(() => {
    if (currentSentence) {
      setOptions(buildOptions(currentSentence));
      setSelected(null);
      setIsCorrect(null);
    }
  }, [currentSentence]);

  const finishGame = useCallback(
    async (completed: boolean) => {
      if (sessionIdRef.current) {
        await endSession(sessionIdRef.current, {
          cardsStudied: Math.min(index + 1, gameSentences.length),
          cardsCorrect: totalCorrect,
          durationSecs: Math.round((Date.now() - startTimeRef.current) / 1000),
        });
      }
      if (completed) {
        setGameComplete(true);
      } else {
        setGameOver(true);
      }
    },
    [index, gameSentences.length, totalCorrect, endSession],
  );

  const handleSelect = useCallback(
    async (particle: string) => {
      if (selected || !currentSentence) return;
      setSelected(particle);

      const correct = particle === currentSentence.targetParticle;
      setIsCorrect(correct);

      const xpAmount = correct ? XP_CORRECT : XP_WRONG;
      setXpPop({ amount: xpAmount, correct, key: Date.now() });
      setTimeout(() => setXpPop(null), 1300);
      triggerXpEarned(xpAmount);

      if (correct) {
        setScore((s) => s + 1);
        setTotalCorrect((c) => c + 1);
        setStreak((s) => {
          const next = s + 1;
          setBestStreak((b) => Math.max(b, next));
          return next;
        });
      } else {
        setStreak(0);
        setLives((l) => l - 1);
      }

      if (sessionIdRef.current) {
        await recordAnswer(sessionIdRef.current, correct);
      }
    },
    [selected, currentSentence, recordAnswer, triggerXpEarned],
  );

  const handleNext = useCallback(() => {
    if (lives <= 0) {
      finishGame(false);
      return;
    }
    if (index + 1 >= gameSentences.length) {
      finishGame(true);
      return;
    }
    setIndex((i) => i + 1);
  }, [lives, index, gameSentences.length, finishGame]);

  // Auto-advance after correct answer
  useEffect(() => {
    if (isCorrect === true) {
      const t = setTimeout(handleNext, 1500);
      return () => clearTimeout(t);
    }
  }, [isCorrect, handleNext]);

  const handleRestart = useCallback(() => {
    setIndex(0);
    setLives(MAX_LIVES);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setTotalCorrect(0);
    setSelected(null);
    setIsCorrect(null);
    setGameOver(false);
    setGameComplete(false);
    startSession(deckId, 'kotoba-bubble').then((id) => {
      sessionIdRef.current = id;
      startTimeRef.current = Date.now();
    });
  }, [deckId, startSession]);

  // ── Loading / generation states ────────────────────────────────────────────
  if (loading) {
    return <Loading message="Loading Kotoba Bubble..." />;
  }

  if (error && !hasContent) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button onClick={onExit} variant="outlined">
          Back
        </Button>
      </Box>
    );
  }

  if (generating) {
    return <Loading message="Generating practice sentences..." />;
  }

  if (!hasContent) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Typography sx={{ fontSize: '3rem', mb: 2 }}>🫧</Typography>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
          Kotoba Bubble
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3, maxWidth: 360, mx: 'auto' }}>
          {isMemberAccount
            ? "Your teacher hasn't set up this game for this deck yet. Ask them to generate practice sentences!"
            : "Generate fun practice sentences from this deck's vocabulary. The AI will create natural conversations your student can practice with!"}
        </Typography>
        {!isMemberAccount && (
          <Button
            variant="contained"
            size="large"
            onClick={generate}
            startIcon={<AutoAwesomeIcon />}
            sx={{ borderRadius: 3, textTransform: 'none', fontWeight: 700, px: 4 }}
          >
            Generate Practice
          </Button>
        )}
        {error && (
          <Alert severity="error" sx={{ mt: 2, maxWidth: 400, mx: 'auto' }}>
            {error}
          </Alert>
        )}
        <Box sx={{ mt: 2 }}>
          <Button onClick={onExit} color="inherit" size="small">
            Back
          </Button>
        </Box>
      </Box>
    );
  }

  if (gameSentences.length < MIN_SENTENCES) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Typography color="text.secondary">
          Not enough practice sentences. Need at least {MIN_SENTENCES}.
        </Typography>
        <Button onClick={onExit} sx={{ mt: 2 }} variant="outlined">
          Back
        </Button>
      </Box>
    );
  }

  // ── Game over (lost all lives) ─────────────────────────────────────────────
  if (gameOver) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Typography sx={{ fontSize: '3rem', mb: 1 }}>💔</Typography>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
          Game Over!
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 0.5 }}>
          You got {score} out of {gameSentences.length} correct
        </Typography>
        {bestStreak >= 2 && (
          <Typography color="text.secondary" sx={{ fontSize: '0.9rem', mb: 3 }}>
            Best streak: {bestStreak} in a row!
          </Typography>
        )}
        <Stack direction="row" spacing={2} justifyContent="center">
          <Button
            variant="contained"
            onClick={handleRestart}
            sx={{ borderRadius: 3, textTransform: 'none' }}
          >
            Try Again
          </Button>
          <Button
            variant="outlined"
            onClick={onExit}
            sx={{ borderRadius: 3, textTransform: 'none' }}
          >
            Exit
          </Button>
        </Stack>
      </Box>
    );
  }

  // ── Game complete (celebration) ────────────────────────────────────────────
  if (gameComplete) {
    const pct = totalCorrect / gameSentences.length;
    const isPerfect = pct === 1;
    if (isPerfect) triggerXpEarned(XP_PERFECT_BONUS);

    return (
      <CelebrationScreen
        heading={isPerfect ? 'Perfect!' : pct >= 0.7 ? 'Great job!' : 'Keep going!'}
        subheading={`${totalCorrect} / ${gameSentences.length} correct`}
        extra={bestStreak >= 3 ? `Best streak: ${bestStreak} in a row!` : undefined}
        mode="kotoba-bubble"
        onExit={onExit}
      />
    );
  }

  // ── Main game UI ───────────────────────────────────────────────────────────
  if (!currentSentence) return null;

  const progress = (index / gameSentences.length) * 100;
  const plainText = stripFurigana(currentSentence.sentenceJp);
  const hintText =
    PARTICLE_HINTS[currentSentence.targetParticle] ?? 'connects parts of the sentence';

  return (
    <Box
      sx={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        minHeight: { xs: 'calc(100vh - 260px)', sm: 'calc(100vh - 280px)' },
      }}
    >
      <XpEarnedPop
        amount={xpPop?.amount ?? 0}
        correct={xpPop?.correct ?? true}
        show={!!xpPop}
        key={xpPop?.key}
      />

      {/* Header: lives + progress + score */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
        <Stack direction="row" spacing={0.3}>
          {Array.from({ length: MAX_LIVES }, (_, i) =>
            i < lives ? (
              <FavoriteIcon key={i} sx={{ fontSize: 24, color: '#EF4444' }} />
            ) : (
              <FavoriteBorderIcon key={i} sx={{ fontSize: 24, color: 'text.disabled' }} />
            ),
          )}
        </Stack>
        <Stack direction="row" spacing={1.5} alignItems="center">
          {streak >= 2 && (
            <Typography
              sx={{
                fontSize: '0.9rem',
                fontWeight: 800,
                color: accent[500],
              }}
            >
              {streak}x streak
            </Typography>
          )}
          <Typography
            sx={{
              fontSize: '0.95rem',
              fontWeight: 700,
              color: 'text.secondary',
            }}
          >
            {index + 1} / {gameSentences.length}
          </Typography>
        </Stack>
      </Stack>

      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{
          mb: 3,
          height: 8,
          borderRadius: 4,
          bgcolor: alpha(brand[100], 0.5),
          '& .MuiLinearProgress-bar': {
            borderRadius: 4,
            background: `linear-gradient(90deg, ${brand[400]}, ${accent[400]})`,
          },
        }}
      />

      {/* Sentence card — fills available space */}
      <Paper
        elevation={0}
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          borderRadius: 4,
          border: `1px solid ${alpha(brand[200], 0.5)}`,
          bgcolor: alpha('#fff', 0.5),
          px: { xs: 2, sm: 4 },
          py: { xs: 3, sm: 4 },
          mb: 3,
        }}
      >
        {/* Conversation group label */}
        {currentSentence.sentenceType !== 'statement' && (
          <Typography
            sx={{
              fontSize: '0.8rem',
              fontWeight: 700,
              color: 'text.disabled',
              mb: 1.5,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            {currentSentence.sentenceType === 'question' ? 'Question' : 'Response'}
          </Typography>
        )}

        <SentenceDisplay
          sentence={currentSentence}
          revealed={isCorrect !== null}
          showFurigana={showFurigana}
          deckWords={deckWords}
        />

        {/* Audio button after reveal */}
        {isCorrect !== null && (
          <Box sx={{ mt: 1.5 }}>
            <SpeakButton text={plainText} iconSize="1.4rem" />
          </Box>
        )}

        {/* Feedback on wrong answer */}
        {isCorrect === false && (
          <Box
            sx={{
              mt: 2,
              animation: 'wrongShake 0.4s ease-out, fadeIn 0.3s ease',
              '@keyframes wrongShake': {
                '0%': { transform: 'translateX(0)' },
                '20%': { transform: 'translateX(-6px)' },
                '40%': { transform: 'translateX(6px)' },
                '60%': { transform: 'translateX(-3px)' },
                '80%': { transform: 'translateX(3px)' },
                '100%': { transform: 'translateX(0)' },
              },
              '@keyframes fadeIn': {
                from: { opacity: 0 },
                to: { opacity: 1 },
              },
            }}
          >
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1,
                maxWidth: 400,
                bgcolor: alpha('#EF4444', 0.1),
                border: `1.5px solid ${alpha('#EF4444', 0.3)}`,
                borderRadius: 2.5,
                px: 2.5,
                py: 1.2,
              }}
            >
              <Typography sx={{ fontSize: '1.1rem' }}>✕</Typography>
              <Typography
                sx={{
                  fontSize: '0.9rem',
                  color: 'text.primary',
                }}
              >
                The answer is <strong>{currentSentence.targetParticle}</strong> — {hintText}
              </Typography>
            </Box>
          </Box>
        )}
      </Paper>

      {/* Bubble options */}
      <Stack
        direction="row"
        spacing={{ xs: 2, sm: 3 }}
        justifyContent="center"
        sx={{ mb: 3, flexWrap: 'wrap', gap: { xs: 2, sm: 3 } }}
      >
        {options.map((particle, i) => {
          let state: 'idle' | 'correct' | 'wrong' = 'idle';
          if (selected) {
            if (particle === currentSentence.targetParticle) state = 'correct';
            else if (particle === selected) state = 'wrong';
          }
          return (
            <BubbleButton
              key={`${particle}-${i}`}
              particle={particle}
              index={i}
              disabled={selected !== null}
              state={state}
              onClick={() => handleSelect(particle)}
            />
          );
        })}
      </Stack>

      {/* Next button on wrong answer (correct auto-advances) */}
      {isCorrect === false && (
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <Button
            variant="contained"
            onClick={handleNext}
            sx={{
              borderRadius: 3,
              textTransform: 'none',
              fontWeight: 700,
              px: 5,
              py: 1.2,
              fontSize: '1rem',
            }}
          >
            {lives <= 0 ? 'See Results' : 'Next'}
          </Button>
        </Box>
      )}
    </Box>
  );
}
