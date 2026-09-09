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
import { useEffect, useMemo } from 'react';

import { AssignmentGoalPicker } from '@/components/Group/AssignmentGoalPicker';
import type { GoalMode } from '@/lib/assignmentMastery';
import {
  gapSetIds,
  type GroupKanaReadiness,
  hasKanaSignal,
  MAX_COMPANION_KANA_ROWS,
  planKanaGaps,
  planLessonKana,
  type ReadingLevelInput,
} from '@/lib/kanaGaps';
import { addDaysToDate, deckIsSkipped, planCounts, weekNumbers } from '@/lib/lessonPlanEdits';
import type { JlptLevel } from '@/lib/lessonPrompts';
import { planReuse } from '@/lib/lessonReuse';
import type { LessonPlan, PlanDeck, WarmUpWord } from '@/types/lessonPlan';

import { PlanDeckCard } from './PlanDeckCard';
import { PrintButtons } from './PrintButtons';
import { WarmUpPanel } from './WarmUpPanel';
import { WeekSoundsLine } from './WeekSoundsLine';

interface ReviewStepProps {
  plan: LessonPlan;
  groupId: string;
  warmUp: WarmUpWord[];
  knownWords: WarmUpWord[];
  kanaReadiness: GroupKanaReadiness | null;
  readingLevel: ReadingLevelInput;
  /** Week numbers whose rows the educator switched off. */
  skippedSoundWeeks: number[];
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
  onRegenerateUnapproved: (index: number, targetCount: number) => void;
  onDueDateChange: (date: string) => void;
  onAccuracyChange: (accuracy: number | null) => void;
  onModeChange: (mode: GoalMode | null) => void;
  onSkippedSoundWeeksChange: (weeks: number[]) => void;
  /** Lifted so apply and the post-apply print button see the same rows. */
  onCompanionSetsChange: (rows: { setId: string; dueDate: string }[]) => void;
  onApply: () => void;
  onStartOver: () => void;
}

export function ReviewStep({
  plan,
  groupId,
  warmUp,
  knownWords,
  kanaReadiness,
  readingLevel,
  skippedSoundWeeks,
  dueDate,
  accuracy,
  mode,
  targetLevel,
  applying,
  ticksLocked,
  retryingIndex,
  onDeckChange,
  onRetryDeck,
  onRegenerateUnapproved,
  onDueDateChange,
  onAccuracyChange,
  onModeChange,
  onSkippedSoundWeeksChange,
  onCompanionSetsChange,
  onApply,
  onStartOver,
}: ReviewStepProps) {
  const t = useTranslations('Group.lessonBuilder');
  const theme = useTheme();
  const { brand } = theme.palette;

  const reuse = useMemo(() => planReuse(plan.decks, knownWords), [plan.decks, knownWords]);
  const counts = useMemo(() => planCounts(plan), [plan]);
  const numbers = useMemo(() => weekNumbers(plan.decks), [plan.decks]);
  const kanaGaps = useMemo(
    () => planKanaGaps(plan.decks, kanaReadiness),
    [plan.decks, kanaReadiness],
  );
  // Capped here as well as server-side: what the review shows, what apply
  // sends and what the sheets print all have to be the same list.
  const soundWeeks = useMemo(() => {
    const weeks = planLessonKana(plan.decks, kanaReadiness, readingLevel, dueDate).weeks;
    const kept: typeof weeks = [];
    let rows = 0;
    for (const week of weeks) {
      const room = MAX_COMPANION_KANA_ROWS - rows;
      if (room <= 0) break;
      const setIds = week.setIds.slice(0, room);
      rows += setIds.length;
      kept.push({ ...week, setIds });
    }
    return kept;
  }, [plan.decks, kanaReadiness, readingLevel, dueDate]);
  // Rows the plan needed but its own weeks could not hold: shown after the
  // last deck so nothing is handed out that the educator never saw.
  const overflowWeeks = useMemo(
    () => soundWeeks.filter((week) => !numbers.includes(week.index)),
    [soundWeeks, numbers],
  );
  const handedOut = useMemo(
    () => soundWeeks.filter((week) => !skippedSoundWeeks.includes(week.index)),
    [soundWeeks, skippedSoundWeeks],
  );
  const companionKey = handedOut
    .flatMap((week) => week.setIds.map((setId) => `${setId}:${week.dueDate}`))
    .join(',');
  useEffect(() => {
    onCompanionSetsChange(
      companionKey
        ? companionKey.split(',').map((pair) => {
            const [setId, dueDate] = pair.split(':');
            return { setId, dueDate };
          })
        : [],
    );
  }, [companionKey, onCompanionSetsChange]);

  // Only the cards still going out: an excluded card must not explain a chip.
  const shakySetIds = useMemo(
    () =>
      kanaGaps.flatMap((deck, i) =>
        deckIsSkipped(plan.decks[i]) ? [] : deck.flatMap((cards) => gapSetIds(cards)),
      ),
    [kanaGaps, plan.decks],
  );

  const noKanaData =
    !!kanaReadiness && kanaReadiness.members.length > 0 && !hasKanaSignal(kanaReadiness);

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

      {noKanaData && (
        <Alert severity="info" icon={false}>
          {t('kanaNoDataNote')}
        </Alert>
      )}

      <WarmUpPanel warmUp={warmUp} />

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
            kanaGaps={kanaGaps[i] ?? []}
            targetLevel={targetLevel}
            ticksLocked={ticksLocked}
            retrying={retryingIndex === i}
            onDeckChange={(next) => onDeckChange(i, next)}
            onRetry={() => onRetryDeck(i)}
            onRegenerateUnapproved={(targetCount) => onRegenerateUnapproved(i, targetCount)}
            sounds={
              week === null ? null : (
                <WeekSoundsLine
                  setIds={soundWeeks.find((s) => s.index === week)?.setIds ?? []}
                  dueDate={soundWeeks.find((s) => s.index === week)?.dueDate ?? ''}
                  handOut={!skippedSoundWeeks.includes(week)}
                  locked={ticksLocked}
                  shakySetIds={shakySetIds}
                  onHandOutChange={(on) =>
                    onSkippedSoundWeeksChange(
                      on
                        ? skippedSoundWeeks.filter((n) => n !== week)
                        : [...skippedSoundWeeks, week],
                    )
                  }
                />
              )
            }
          />
        );
      })}

      {overflowWeeks.map((week) => (
        <Paper
          key={`sounds-${week.index}`}
          elevation={0}
          sx={{
            p: { xs: 2, sm: 2.5 },
            borderRadius: theme.radii.lg,
            border: `1px solid ${alpha(brand[300], 0.4)}`,
            bgcolor: 'background.paper',
          }}
        >
          <Typography sx={{ fontWeight: 800 }}>
            {t('soundsAfterPlanHeading', { week: week.index })}
          </Typography>
          <WeekSoundsLine
            setIds={week.setIds}
            dueDate={week.dueDate}
            handOut={!skippedSoundWeeks.includes(week.index)}
            locked={ticksLocked}
            shakySetIds={shakySetIds}
            onHandOutChange={(on) =>
              onSkippedSoundWeeksChange(
                on
                  ? skippedSoundWeeks.filter((n) => n !== week.index)
                  : [...skippedSoundWeeks, week.index],
              )
            }
          />
        </Paper>
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
            <PrintButtons
              plan={plan}
              warmUp={warmUp}
              kanaSets={handedOut.flatMap((week) => week.setIds)}
              groupId={groupId}
              disabled={applying || counts.decks === 0}
            />
            <Button onClick={onStartOver} disabled={applying} sx={{ textTransform: 'none' }}>
              {t('startOverButton')}
            </Button>
          </Box>
        </Stack>
      </Paper>
    </Stack>
  );
}
