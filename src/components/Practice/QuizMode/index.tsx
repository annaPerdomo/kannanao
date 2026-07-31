'use client';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import {
  Box,
  Button,
  Chip,
  Grid,
  LinearProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { SpeakButton } from '@/components/SpeakButton';
import { useProgress } from '@/hooks/useProgress';
import { useQuizFlow } from '@/hooks/useQuizFlow';
import { buildMeaningChoices, getFlashcardDisplayText } from '@/lib/flashcardUtils';
import { checkTypedAnswer, quizAccuracy } from '@/lib/quiz';
import { insertQuizResult } from '@/lib/supabase';
import type { Flashcard } from '@/types/flashcard';

import { QuizResultScreen } from './QuizResultScreen';

interface QuizModeProps {
  cards: Flashcard[];
  deckId: string;
  /** Number of questions; defaults to the module default (10). */
  count?: number;
  onExit: () => void;
}

const CHOICE_LABELS = ['A', 'B', 'C', 'D'];

export function QuizMode({ cards, deckId, count, onExit }: QuizModeProps) {
  const theme = useTheme();
  const { brand, surfaces } = theme.palette;
  const t = useTranslations('Practice.quizMode');
  const tCommon = useTranslations('Practice.common');

  const quiz = useQuizFlow(cards, count);
  const { startSession, recordAnswer, endSession } = useProgress();

  const [sessionId, setSessionId] = useState('');
  const startTimeRef = useRef<number>(Date.now());
  const finalizedRef = useRef(false);

  // Per-question local state
  const [selected, setSelected] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [answered, setAnswered] = useState<{ correct: boolean } | null>(null);

  const card = quiz.current?.card;
  const type = quiz.current?.type;

  // Choices for a multiple-choice question, rebuilt when the card changes.
  const choices = useMemo(
    () => (card && type === 'choice' ? buildMeaningChoices(card, cards) : []),
    [card, type, cards],
  );

  useEffect(() => {
    startSession(deckId, 'quiz').then((id) => {
      setSessionId(id);
      startTimeRef.current = Date.now();
    });
  }, [deckId, startSession]);

  // Record the answer (feeds XP + per-card SRS) and reveal feedback.
  const grade = useCallback(
    async (correct: boolean) => {
      if (!card || answered) return;
      setAnswered({ correct });
      if (sessionId) {
        await recordAnswer(sessionId, correct, card.jlptLevel, card.id);
      }
    },
    [card, answered, recordAnswer, sessionId],
  );

  // Move to the next question — the only progression. No re-queue of wrong cards.
  const advance = useCallback(() => {
    const correct = answered?.correct ?? false;
    setAnswered(null);
    setSelected(null);
    setInput('');
    quiz.answer(correct);
  }, [answered, quiz]);

  // Auto-advance shortly after a correct answer, like the other practice modes.
  useEffect(() => {
    if (answered?.correct) {
      const t = setTimeout(advance, 1100);
      return () => clearTimeout(t);
    }
  }, [answered, advance]);

  // Finalize once: close the session and persist the graded result row. Waits
  // for the session id so a fast finish (quiz done before startSession resolves)
  // still records — hence sessionId is in the deps.
  useEffect(() => {
    if (quiz.phase !== 'done' || finalizedRef.current || !sessionId) return;
    finalizedRef.current = true;
    const accuracy = quizAccuracy(quiz.score, quiz.total);
    const durationSecs = Math.round((Date.now() - startTimeRef.current) / 1000);
    void (async () => {
      // endSession first so the session row's card counts are settled before the
      // assignment auto-complete it triggers evaluates mastery for this quiz.
      await endSession(sessionId, {
        cardsStudied: quiz.total,
        cardsCorrect: quiz.score,
        durationSecs,
      });
      await insertQuizResult({
        deckId,
        score: quiz.score,
        total: quiz.total,
        accuracy,
        sessionId,
      });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quiz.phase, sessionId]);

  // ── Result screen ──────────────────────────────────────────────────────────
  if (quiz.phase === 'done') {
    return (
      <QuizResultScreen
        score={quiz.score}
        total={quiz.total}
        accuracy={quizAccuracy(quiz.score, quiz.total)}
        onExit={onExit}
      />
    );
  }

  if (!card) return null;
  const display = getFlashcardDisplayText(card);

  return (
    <Box sx={{ position: 'relative' }}>
      {/* Status row — the page-level PageHeader already names the mode */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mb: 2 }}>
        <Chip label={t('progressChip', { current: quiz.index + 1, total: quiz.total })} />
      </Box>

      <LinearProgress
        variant="determinate"
        value={(quiz.index / quiz.total) * 100}
        sx={{
          mb: 3,
          height: 8,
          borderRadius: 4,
          bgcolor: alpha(brand[300], 0.12),
          '& .MuiLinearProgress-bar': { bgcolor: 'primary.main', borderRadius: 4 },
        }}
      />

      {/* Prompt card */}
      <Box
        sx={{
          border: '2px solid',
          borderColor: answered
            ? answered.correct
              ? 'success.main'
              : 'error.main'
            : alpha(brand[300], 0.45),
          borderRadius: 3,
          overflow: 'hidden',
          mb: 3,
          transition: 'border-color 0.25s',
        }}
      >
        <Box sx={{ p: 3, textAlign: 'center', bgcolor: surfaces.input }}>
          {type === 'choice' ? (
            <>
              <Box
                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}
              >
                <Typography
                  sx={{
                    fontFamily: (t) => t.fonts.jp,
                    fontSize: '2.2rem',
                    fontWeight: 700,
                    color: 'text.primary',
                  }}
                >
                  {display.titleText}
                </Typography>
                <SpeakButton text={card.word} iconSize="1.4rem" />
              </Box>
              <Typography
                variant="caption"
                sx={{ color: 'text.secondary', letterSpacing: '0.12em', display: 'block', mt: 1.5 }}
              >
                {t('whatDoesThisMean')}
              </Typography>
            </>
          ) : (
            <>
              <Typography sx={{ fontSize: '1.8rem', fontWeight: 700, color: 'text.primary' }}>
                {card.meaning}
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: 'text.secondary', letterSpacing: '0.12em', display: 'block', mt: 1.5 }}
              >
                {t('typeTheJapaneseWord')}
              </Typography>
            </>
          )}
        </Box>
      </Box>

      {/* Multiple-choice answers */}
      {type === 'choice' && (
        <Grid container spacing={1.5} sx={{ mb: 2 }}>
          {choices.map((choice, i) => {
            const isCorrect = choice === card.meaning;
            const isSelected = selected === choice;
            let borderColor: string = alpha(brand[200], 0.7);
            let bgcolor: string = surfaces.input;
            let iconEl: React.ReactNode = null;
            if (answered) {
              if (isCorrect) {
                borderColor = theme.palette.success.main;
                bgcolor = alpha(theme.palette.success.main, 0.1);
                iconEl = <CheckIcon sx={{ color: 'success.main', flexShrink: 0 }} />;
              } else if (isSelected) {
                borderColor = theme.palette.error.main;
                bgcolor = alpha(theme.palette.error.main, 0.08);
                iconEl = <CloseIcon sx={{ color: 'error.main', flexShrink: 0 }} />;
              }
            }
            return (
              <Grid size={{ xs: 12, sm: 6 }} key={choice}>
                <Box
                  role="button"
                  tabIndex={answered ? -1 : 0}
                  aria-label={choice}
                  onClick={() => {
                    if (answered) return;
                    setSelected(choice);
                    void grade(isCorrect);
                  }}
                  onKeyDown={(e) => {
                    if (!answered && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      setSelected(choice);
                      void grade(isCorrect);
                    }
                  }}
                  sx={{
                    p: 2,
                    border: '2px solid',
                    borderRadius: 2,
                    cursor: answered ? 'default' : 'pointer',
                    borderColor,
                    bgcolor,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    minHeight: 60,
                    transition: 'all 0.2s',
                    '&:hover': !answered
                      ? { borderColor: brand[500], bgcolor: alpha(brand[300], 0.15) }
                      : {},
                  }}
                >
                  <Box
                    sx={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      border: `2px solid ${alpha(brand[300], 0.4)}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {iconEl ?? (
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>
                        {CHOICE_LABELS[i]}
                      </Typography>
                    )}
                  </Box>
                  <Typography sx={{ flexGrow: 1 }}>{choice}</Typography>
                </Box>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Typed answer */}
      {type === 'typed' && (
        <Stack direction="row" spacing={1.5} alignItems="flex-end" sx={{ mb: 2 }}>
          <TextField
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !answered && input.trim())
                void grade(checkTypedAnswer(input, card));
            }}
            label={t('answerLabel')}
            placeholder={t('answerPlaceholder')}
            disabled={!!answered}
            fullWidth
            size="small"
            autoFocus
          />
          {!answered && (
            <Button
              variant="contained"
              onClick={() => void grade(checkTypedAnswer(input, card))}
              disabled={!input.trim()}
              sx={{ flexShrink: 0 }}
            >
              {t('check')}
            </Button>
          )}
        </Stack>
      )}

      {/* Feedback + manual advance (auto-advances on correct) */}
      {answered && (
        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            border: '1px solid',
            borderColor: answered.correct ? 'success.main' : 'error.main',
            bgcolor: answered.correct
              ? alpha(theme.palette.success.main, 0.1)
              : alpha(theme.palette.error.main, 0.08),
            mb: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          {answered.correct ? (
            <CheckIcon sx={{ color: 'success.main' }} />
          ) : (
            <CloseIcon sx={{ color: 'error.main' }} />
          )}
          <Typography
            variant="body2"
            color={answered.correct ? 'success.main' : 'error.main'}
            sx={{ flexGrow: 1 }}
          >
            {answered.correct
              ? tCommon('correctMovingOn')
              : card.reading && card.reading !== card.word
                ? t('answerRevealWithReading', { word: card.word, reading: card.reading })
                : t('answerReveal', { word: card.word })}
          </Typography>
          {!answered.correct && (
            <Button variant="contained" size="small" onClick={advance} sx={{ flexShrink: 0 }}>
              {quiz.index + 1 >= quiz.total ? t('seeResults') : t('nextArrow')}
            </Button>
          )}
        </Box>
      )}

      <Box sx={{ mt: 2, textAlign: 'right' }}>
        <Button size="small" onClick={onExit} sx={{ color: 'text.secondary' }}>
          {t('quit')}
        </Button>
      </Box>
    </Box>
  );
}
