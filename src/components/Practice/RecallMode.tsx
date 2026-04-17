'use client';
import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  LinearProgress,
  Chip,
  Grid,
  Button,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import type { Flashcard } from '@/types/flashcard';
import { getFlashcardDisplayText } from '@/lib/flashcardUtils';
import { useProgress } from '@/hooks/useProgess';
import { CelebrationScreen } from './CelebrationScreen';

interface RecallModeProps {
  cards: Flashcard[];
  deckId: string;
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

export function RecallMode({ cards, deckId, onExit }: RecallModeProps) {
  const theme = useTheme();
  const { brand, surfaces } = theme.palette;

  const pool = useMemo(() => [...cards].sort(() => Math.random() - 0.5), [cards]);
  const [index, setIndex] = useState(0);
  const [choices, setChoices] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  const { startSession, recordAnswer, endSession } = useProgress();
  const sessionIdRef = useRef<string>('');
  const startTimeRef = useRef<number>(Date.now());
  const correctCountRef = useRef(0);

  useEffect(() => {
    startSession(deckId, 'recall').then((id) => {
      sessionIdRef.current = id;
      startTimeRef.current = Date.now();
    });
  }, [deckId, startSession]);

  const card = pool[index];
  const done = index >= pool.length;

  // Rebuild choices whenever the card changes
  useEffect(() => {
    if (card) setChoices(buildChoices(card, cards));
  }, [index, cards]); // eslint-disable-line react-hooks/exhaustive-deps

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
      if (correct) {
        setScore((s) => s + 1);
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
        await recordAnswer(sessionIdRef.current, correct, card.jlptLevel);
      }
    },
    [selected, card, recordAnswer],
  );

  const handleExit = async () => {
    if (sessionIdRef.current) {
      await endSession(sessionIdRef.current, {
        cardsStudied: index,
        cardsCorrect: correctCountRef.current,
        durationSecs: Math.round((Date.now() - startTimeRef.current) / 1000),
      });
    }
    onExit();
  };

  useEffect(() => {
    if (done && sessionIdRef.current) {
      endSession(sessionIdRef.current, {
        cardsStudied: pool.length,
        cardsCorrect: correctCountRef.current,
        durationSecs: Math.round((Date.now() - startTimeRef.current) / 1000),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  // ── Completion screen ──────────────────────────────────────────────────────
  if (done) {
    const pct = pool.length > 0 ? score / pool.length : 0;
    const heading = pct === 1 ? 'Perfect!' : pct >= 0.7 ? 'Great job!' : 'Keep going!';
    return (
      <CelebrationScreen
        heading={heading}
        subheading={`${score} / ${pool.length} correct`}
        extra={bestStreak >= 3 ? `🔥 Best streak: ${bestStreak} in a row!` : undefined}
        mode="recall"
        onExit={onExit}
      />
    );
  }

  // ── Quiz card ──────────────────────────────────────────────────────────────
  const display = getFlashcardDisplayText(card);
  const answeredCorrectly = selected === card.meaning;
  const answeredWrong = !!selected && !answeredCorrectly;

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h5">Guess It!</Typography>
          {streak >= 2 && (
            <Chip label={`🔥 ${streak}`} size="small" color="warning" sx={{ fontWeight: 700 }} />
          )}
        </Box>
        <Chip label={`${score} / ${pool.length}`} />
      </Box>

      <LinearProgress
        variant="determinate"
        value={(index / pool.length) * 100}
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
          <Box
            component="img"
            src={card.imageUrl}
            alt={card.word}
            sx={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }}
          />
        )}
        <Box sx={{ p: 3, textAlign: 'center', bgcolor: surfaces.input }}>
          <Typography
            sx={{
              fontFamily: '"Noto Serif JP", serif',
              fontSize: '2.2rem',
              fontWeight: 700,
              color: 'text.primary',
              mb: 0.5,
            }}
          >
            {display.titleText}
          </Typography>
          {display.subtitleText && (
            <Typography variant="body1" color="text.secondary">
              {display.subtitleText}
            </Typography>
          )}
          {!card.imageUrl && card.example_jp && (
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                display: 'block',
                mt: 1,
                fontFamily: '"Noto Serif JP", serif',
                fontSize: '0.9rem',
              }}
            >
              {card.example_jp}
            </Typography>
          )}
          <Typography
            variant="caption"
            sx={{ color: 'text.disabled', letterSpacing: '0.12em', display: 'block', mt: 1.5 }}
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
                  transform:
                    selected && isThisCorrect ? 'scale(1.02)' : 'scale(1)',
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
                  iconEl ?? (
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
                  )
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
            {index + 1 >= pool.length ? 'See Results' : 'Next →'}
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
        <Button size="small" color="inherit" onClick={handleExit} sx={{ opacity: 0.5 }}>
          Quit &amp; Save Progress
        </Button>
      </Box>
    </Box>
  );
}
