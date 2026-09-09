'use client';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

import { Loading } from '@/components/Loading';
import type { Group } from '@/hooks/useGroups';
import { useLessonPlan } from '@/hooks/useLessonPlan';
import type { GoalMode } from '@/lib/assignmentMastery';
import { setCharacters } from '@/lib/kanaCurriculum';
import { prefillReadingLevelAnswer } from '@/lib/kanaGaps';
import { DEFAULT_LEVEL } from '@/lib/lessonPrompts';
import type { PlanDeck } from '@/types/lessonPlan';

import { AskStep } from './AskStep';
import {
  DEFAULT_CARDS_PER_DECK,
  DEFAULT_WEEKS,
  defaultReadingLevel,
  effectiveStyleNotes,
  type LessonSetForm,
  nextSunday,
} from './constants';
import { PrintButtons } from './PrintButtons';
import { ReviewStep } from './ReviewStep';
import { useDeckRedraw } from './useDeckRedraw';

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
  generateImages: false,
  readingLevel: defaultReadingLevel(DEFAULT_LEVEL),
};

/**
 * Ask → review → apply, on one page. Nothing is written until "Create decks &
 * assign", so a plan the organizer doesn't like costs nothing. Applying covers
 * the whole group: current members now, later joiners via the saved schedule.
 */
export function LessonSetBuilder({ groups, groupId, onGroupChange }: LessonSetBuilderProps) {
  const t = useTranslations('Group.lessonBuilder');
  const router = useRouter();
  const {
    plan,
    setPlan,
    warmUp,
    knownWords,
    results,
    building,
    applying,
    applyFailed,
    kanaReadiness,
    kanaReadingStages,
    kanaAssigned,
    kanaFailed,
    error,
    build,
    apply,
    reset,
    mergeWarmUpWords,
  } = useLessonPlan();

  const [form, setForm] = useState<LessonSetForm>(EMPTY_FORM);
  const [dueDate, setDueDate] = useState(() => nextSunday());
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [mode, setMode] = useState<GoalMode | null>(null);
  const [skippedSoundWeeks, setSkippedSoundWeeks] = useState<number[]>([]);
  const [companionRows, setCompanionRows] = useState<{ setId: string; dueDate: string }[]>([]);

  const { retryingIndex, retryError, handleRetryDeck, handleRegenerateUnapproved } = useDeckRedraw({
    plan,
    form,
    groupId,
    setPlan,
    mergeWarmUpWords,
  });

  const patchForm = useCallback((patch: Partial<LessonSetForm>) => {
    setForm((current) => ({ ...current, ...patch }));
  }, []);

  // Real reading data outranks the level guess, but only until the educator
  // touches the control: after that the answer is theirs.
  const [readingAnswered, setReadingAnswered] = useState(false);
  useEffect(() => {
    if (!kanaReadingStages || readingAnswered) return;
    setForm((current) => ({
      ...current,
      readingLevel: {
        // An empty list is nobody having started, not evidence about the group.
        hiragana: kanaReadingStages.hiragana.length
          ? prefillReadingLevelAnswer(kanaReadingStages.hiragana)
          : current.readingLevel.hiragana,
        katakana: kanaReadingStages.katakana.length
          ? prefillReadingLevelAnswer(kanaReadingStages.katakana)
          : current.readingLevel.katakana,
      },
    }));
  }, [kanaReadingStages, readingAnswered]);

  const handleDeckChange = useCallback(
    (index: number, deck: PlanDeck) => {
      setPlan((current) =>
        current ? { decks: current.decks.map((d, i) => (i === index ? deck : d)) } : current,
      );
    },
    [setPlan],
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
          {kanaAssigned.length > 0 && (
            <Alert severity="success">
              {t('kanaAssignedMessage', {
                sounds: kanaAssigned
                  .map((setId) => setCharacters(setId))
                  .filter(Boolean)
                  .join('　'),
              })}
            </Alert>
          )}
          {kanaFailed.length > 0 && (
            <Alert severity="warning">
              {t('kanaAssignFailed', {
                sounds: kanaFailed
                  .map((setId) => setCharacters(setId))
                  .filter(Boolean)
                  .join('　'),
              })}
            </Alert>
          )}
          {failed.map((r) => (
            <Alert key={r.name} severity="warning">
              {t('deckFailed', { name: r.name, reason: r.error ?? '' })}
            </Alert>
          ))}
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
            <Button variant="contained" onClick={() => router.push(`/group/${groupId}`)}>
              {t('backToGroupButton')}
            </Button>
            {plan && (
              <PrintButtons
                plan={plan}
                warmUp={warmUp}
                kanaSets={companionRows.map((row) => row.setId)}
                groupId={groupId}
              />
            )}
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
          onChange={(patch) => {
            if (patch.readingLevel) setReadingAnswered(true);
            // The level is the only signal until the educator answers, so it
            // still moves the answer with it.
            patchForm(
              patch.level && !readingAnswered
                ? { ...patch, readingLevel: defaultReadingLevel(patch.level) }
                : patch,
            );
          }}
          onSubmit={() =>
            build({
              goal: form.goal,
              weeks: form.weeks,
              cardsPerDeck: form.cardsPerDeck,
              documents: form.documents,
              level: form.level,
              styleNotes: effectiveStyleNotes(form),
              groupId,
              generateImages: form.generateImages,
              readingLevel: form.readingLevel,
            })
          }
        />
      )}

      {!results && !building && !applying && plan && (
        <ReviewStep
          plan={plan}
          groupId={groupId}
          warmUp={warmUp}
          knownWords={knownWords}
          kanaReadiness={kanaReadiness}
          readingLevel={form.readingLevel}
          skippedSoundWeeks={skippedSoundWeeks}
          dueDate={dueDate}
          accuracy={accuracy}
          mode={mode}
          targetLevel={form.level}
          applying={applying}
          ticksLocked={applyFailed}
          retryingIndex={retryingIndex}
          onDeckChange={handleDeckChange}
          onRetryDeck={handleRetryDeck}
          onRegenerateUnapproved={handleRegenerateUnapproved}
          onDueDateChange={setDueDate}
          onAccuracyChange={setAccuracy}
          onModeChange={setMode}
          onSkippedSoundWeeksChange={setSkippedSoundWeeks}
          onCompanionSetsChange={setCompanionRows}
          onApply={() =>
            apply({
              groupId,
              firstDueDate: dueDate,
              requiredAccuracy: accuracy,
              requiredMode: mode,
              withSentences: form.withSentences,
              level: form.level,
              styleNotes: effectiveStyleNotes(form),
              kanaWeeks: companionRows,
            })
          }
          onStartOver={reset}
        />
      )}
    </Box>
  );
}
