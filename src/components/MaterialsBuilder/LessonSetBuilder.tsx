'use client';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';

import { Loading } from '@/components/Loading';
import type { Group } from '@/hooks/useGroups';
import { useLessonPlan } from '@/hooks/useLessonPlan';
import type { GoalMode } from '@/lib/assignmentMastery';
import { DEFAULT_LEVEL } from '@/lib/lessonPrompts';
import { buildLessonPlan } from '@/services/api';
import type { PlanDeck } from '@/types/lessonPlan';

import { AskStep } from './AskStep';
import {
  DEFAULT_CARDS_PER_DECK,
  DEFAULT_WEEKS,
  effectiveStyleNotes,
  type LessonSetForm,
  nextSunday,
} from './constants';
import { PrintButtons } from './PrintButtons';
import { ReviewStep } from './ReviewStep';

interface LessonSetBuilderProps {
  groups: Group[];
  groupId: string;
  onGroupChange: (groupId: string) => void;
}

const EMPTY_FORM: LessonSetForm = {
  goal: '',
  weeks: DEFAULT_WEEKS,
  cardsPerDeck: DEFAULT_CARDS_PER_DECK,
  level: DEFAULT_LEVEL,
  audience: 'any',
  styleNotes: '',
  documents: [],
  withSentences: true,
};

/**
 * Ask → review → apply, on one page. Nothing is written until "Create decks &
 * assign", so a plan the organizer doesn't like costs nothing. Applying covers
 * the whole group: current members now, later joiners via the saved schedule.
 */
export function LessonSetBuilder({ groups, groupId, onGroupChange }: LessonSetBuilderProps) {
  const t = useTranslations('Group.lessonBuilder');
  const router = useRouter();
  const { plan, setPlan, results, building, applying, error, build, apply, reset } =
    useLessonPlan();

  const [form, setForm] = useState<LessonSetForm>(EMPTY_FORM);
  const [dueDate, setDueDate] = useState(() => nextSunday());
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [mode, setMode] = useState<GoalMode | null>(null);
  const [retryingIndex, setRetryingIndex] = useState<number | null>(null);
  const [retryError, setRetryError] = useState<string | null>(null);

  const patchForm = useCallback((patch: Partial<LessonSetForm>) => {
    setForm((current) => ({ ...current, ...patch }));
  }, []);

  const handleDeckChange = useCallback(
    (index: number, deck: PlanDeck) => {
      setPlan((current) =>
        current ? { decks: current.decks.map((d, i) => (i === index ? deck : d)) } : current,
      );
    },
    [setPlan],
  );

  /** Redraw one deck rather than the whole plan — the common case when one lands badly. */
  const handleRetryDeck = useCallback(
    async (index: number) => {
      if (!plan) return;
      setRetryingIndex(index);
      setRetryError(null);
      try {
        const deck = plan.decks[index];
        const data = await buildLessonPlan({
          goal: t('retryGoal', { goal: form.goal, deck: deck.name }),
          weeks: 1,
          cardsPerDeck: deck.cards?.length || form.cardsPerDeck,
          documents: form.documents.map((d) => ({ base64: d.base64, mimeType: d.mimeType })),
          level: form.level,
          styleNotes: effectiveStyleNotes(form),
        });
        const replacement = data.plan.decks[0];
        if (replacement) {
          setPlan((current) =>
            current
              ? { decks: current.decks.map((d, i) => (i === index ? replacement : d)) }
              : current,
          );
        }
      } catch (err) {
        setRetryError(err instanceof Error ? err.message : t('errorMessage'));
      } finally {
        setRetryingIndex(null);
      }
    },
    [plan, form, setPlan, t],
  );

  const createdCount = results?.filter((r) => r.status === 'created').length ?? 0;
  const failed = results?.filter((r) => r.status === 'failed') ?? [];

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {retryError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {retryError}
        </Alert>
      )}

      {results && (
        <Stack spacing={2}>
          <Alert severity="success">{t('successMessage', { count: createdCount })}</Alert>
          {failed.map((r) => (
            <Alert key={r.name} severity="warning">
              {t('deckFailed', { name: r.name, reason: r.error ?? '' })}
            </Alert>
          ))}
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
            <Button variant="contained" onClick={() => router.push(`/group/${groupId}`)}>
              {t('backToGroupButton')}
            </Button>
            {plan && <PrintButtons plan={plan} />}
          </Box>
        </Stack>
      )}

      {!results && building && <Loading message={t('buildingMessage')} />}
      {!results && applying && <Loading message={t('applyingMessage')} />}

      {!results && !building && !applying && !plan && (
        <AskStep
          groups={groups}
          groupId={groupId}
          form={form}
          onGroupChange={onGroupChange}
          onChange={patchForm}
          onSubmit={() =>
            build({
              goal: form.goal,
              weeks: form.weeks,
              cardsPerDeck: form.cardsPerDeck,
              documents: form.documents,
              level: form.level,
              styleNotes: effectiveStyleNotes(form),
            })
          }
        />
      )}

      {!results && !building && !applying && plan && (
        <ReviewStep
          plan={plan}
          dueDate={dueDate}
          accuracy={accuracy}
          mode={mode}
          targetLevel={form.level}
          applying={applying}
          retryingIndex={retryingIndex}
          onDeckChange={handleDeckChange}
          onRetryDeck={handleRetryDeck}
          onDueDateChange={setDueDate}
          onAccuracyChange={setAccuracy}
          onModeChange={setMode}
          onApply={() =>
            apply({
              groupId,
              firstDueDate: dueDate,
              requiredAccuracy: accuracy,
              requiredMode: mode,
              withSentences: form.withSentences,
              level: form.level,
              styleNotes: effectiveStyleNotes(form),
            })
          }
          onStartOver={reset}
        />
      )}
    </Box>
  );
}
