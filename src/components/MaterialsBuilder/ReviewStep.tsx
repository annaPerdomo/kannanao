'use client';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { AssignmentGoalPicker } from '@/components/Group/AssignmentGoalPicker';
import type { GoalMode } from '@/lib/assignmentMastery';
import { addDaysToDate, planCounts, weekNumbers } from '@/lib/lessonPlanEdits';
import type { JlptLevel } from '@/lib/lessonPrompts';
import { planReuse } from '@/lib/lessonReuse';
import type { LessonPlan, PlanDeck } from '@/types/lessonPlan';

import { PlanDeckCard } from './PlanDeckCard';
import { PrintButtons } from './PrintButtons';

interface ReviewStepProps {
  plan: LessonPlan;
  dueDate: string;
  accuracy: number | null;
  mode: GoalMode | null;
  targetLevel: JlptLevel;
  applying: boolean;
  /** True after a failed apply: some decks may exist, so include ticks are frozen. */
  ticksLocked: boolean;
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
  dueDate,
  accuracy,
  mode,
  targetLevel,
  applying,
  ticksLocked,
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

  // No outside vocabulary: reuse is measured within the plan, week 2 against week 1.
  const reuse = useMemo(() => planReuse(plan.decks, []), [plan.decks]);
  const counts = useMemo(() => planCounts(plan), [plan]);
  const numbers = useMemo(() => weekNumbers(plan.decks), [plan.decks]);

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography component="h2" sx={{ fontWeight: 800, color: 'text.primary' }}>
          {t('reviewHeading', { decks: counts.decks, cards: counts.cards })}
        </Typography>
        <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', mt: 0.5 }}>
          {t('reviewSubtitle')}
        </Typography>
      </Box>

      {ticksLocked && <Alert severity="info">{t('resumeLockNote')}</Alert>}

      {plan.decks.map((deck, i) => {
        const week = numbers[i];
        return (
          <PlanDeckCard
            // Keyed by index: the deck name is editable (see PlanDeckCard).
            key={i}
            deck={deck}
            weekNumber={week}
            dueDate={week !== null ? addDaysToDate(dueDate, (week - 1) * 7) : null}
            reuse={reuse[i]}
            targetLevel={targetLevel}
            ticksLocked={ticksLocked}
            retrying={retryingIndex === i}
            onDeckChange={(next) => onDeckChange(i, next)}
            onRetry={() => onRetryDeck(i)}
          />
        );
      })}

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

          <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
            {t('groupWideNotice')}
          </Typography>

          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
            <Button
              variant="contained"
              size="large"
              onClick={onApply}
              disabled={applying || counts.decks === 0}
            >
              {applying ? t('applying') : t('applyButton')}
            </Button>
            <PrintButtons plan={plan} disabled={applying || counts.decks === 0} />
            <Button onClick={onStartOver} disabled={applying} sx={{ textTransform: 'none' }}>
              {t('startOverButton')}
            </Button>
          </Box>
        </Stack>
      </Paper>
    </Stack>
  );
}
