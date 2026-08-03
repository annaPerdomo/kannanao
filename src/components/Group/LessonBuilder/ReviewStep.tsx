'use client';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import type { GoalMode } from '@/lib/assignmentMastery';
import { planReuse } from '@/lib/lessonReuse';
import type { LessonPlan, PlanDeck, PlanKnownWord } from '@/types/lessonPlan';

import { AssignmentGoalPicker } from '../AssignmentGoalPicker';
import { PlanDeckCard } from './PlanDeckCard';

interface ReviewStepProps {
  plan: LessonPlan;
  knownWords: PlanKnownWord[];
  dueDate: string;
  accuracy: number | null;
  mode: GoalMode | null;
  applying: boolean;
  retryingIndex: number | null;
  onDeckChange: (index: number, deck: PlanDeck) => void;
  onRetryDeck: (index: number) => void;
  onDueDateChange: (date: string) => void;
  onAccuracyChange: (accuracy: number | null) => void;
  onModeChange: (mode: GoalMode | null) => void;
  onApply: () => void;
  onStartOver: () => void;
}

export function ReviewStep({
  plan,
  knownWords,
  dueDate,
  accuracy,
  mode,
  applying,
  retryingIndex,
  onDeckChange,
  onRetryDeck,
  onDueDateChange,
  onAccuracyChange,
  onModeChange,
  onApply,
  onStartOver,
}: ReviewStepProps) {
  const t = useTranslations('Group.lessonBuilder');
  const theme = useTheme();
  const { brand } = theme.palette;

  const reuse = useMemo(
    () =>
      planReuse(
        plan.decks,
        knownWords.map((w) => w.word),
      ),
    [plan.decks, knownWords],
  );

  const cardTotal = plan.decks.reduce((sum, d) => sum + (d.cards?.length ?? 0), 0);

  return (
    <Stack spacing={2.5}>
      <Typography component="h2" sx={{ fontWeight: 800, color: 'text.primary' }}>
        {t('reviewHeading', { decks: plan.decks.length, cards: cardTotal })}
      </Typography>

      {plan.decks.map((deck, i) => (
        <PlanDeckCard
          key={`${deck.name}-${i}`}
          deck={deck}
          weekNumber={i + 1}
          reuse={reuse[i]}
          retrying={retryingIndex === i}
          onDeckChange={(next) => onDeckChange(i, next)}
          onRetry={() => onRetryDeck(i)}
        />
      ))}

      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 2.5 },
          borderRadius: theme.radii.lg,
          border: `1px solid ${alpha(brand[300], 0.4)}`,
          bgcolor: 'background.paper',
        }}
      >
        <Stack spacing={2}>
          <TextField
            type="date"
            label={t('dueDateLabel')}
            value={dueDate}
            onChange={(e) => onDueDateChange(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ maxWidth: 240 }}
          />

          <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
            {t('dueDateHint')}
          </Typography>

          <AssignmentGoalPicker
            accuracy={accuracy}
            mode={mode}
            onAccuracyChange={onAccuracyChange}
            onModeChange={onModeChange}
          />

          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              size="large"
              onClick={onApply}
              disabled={applying || plan.decks.length === 0}
            >
              {applying ? t('applying') : t('applyButton')}
            </Button>
            <Button onClick={onStartOver} disabled={applying} sx={{ textTransform: 'none' }}>
              {t('startOverButton')}
            </Button>
          </Box>
        </Stack>
      </Paper>
    </Stack>
  );
}
