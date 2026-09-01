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
import { setCharacters } from '@/lib/kanaCurriculum';
import { attachPlanImages } from '@/lib/lessonImages';
import { includedCards } from '@/lib/lessonPlanEdits';
import { CARDS_MAX, CARDS_MIN, DEFAULT_LEVEL, GOAL_MAX } from '@/lib/lessonPrompts';
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
  generateImages: false,
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
  const [assignKanaSets, setAssignKanaSets] = useState(true);
  const [companionSets, setCompanionSets] = useState<string[]>([]);
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
          // The known-word filter can shrink a deck below the route's minimum.
          cardsPerDeck: Math.min(
            CARDS_MAX,
            Math.max(CARDS_MIN, deck.cards?.length || form.cardsPerDeck),
          ),
          documents: form.documents.map((d) => ({ path: d.path, mimeType: d.mimeType })),
          level: form.level,
          styleNotes: effectiveStyleNotes(form),
          groupId,
        });
        const replacementPlan = form.generateImages ? await attachPlanImages(data.plan) : data.plan;
        const replacement = replacementPlan.decks[0];
        if (replacement) {
          setPlan((current) =>
            current
              ? { decks: current.decks.map((d, i) => (i === index ? replacement : d)) }
              : current,
          );
          mergeWarmUpWords(data.warmUp ?? []);
        }
      } catch (err) {
        setRetryError(err instanceof Error ? err.message : t('errorMessage'));
      } finally {
        setRetryingIndex(null);
      }
    },
    [plan, form, groupId, setPlan, mergeWarmUpWords, t],
  );

  /**
   * Keep the approved cards exactly as they are and generate fresh
   * replacements only for the gap — the unapproved ones, plus however many
   * more the educator asked for by raising the target count.
   */
  const handleRegenerateUnapproved = useCallback(
    async (index: number, targetCount: number) => {
      if (!plan) return;
      const deck = plan.decks[index];
      const approved = includedCards(deck);
      const needed = Math.min(CARDS_MAX, Math.max(0, targetCount - approved.length));

      if (needed === 0) {
        setPlan((current) =>
          current
            ? {
                decks: current.decks.map((d, i) => (i === index ? { ...d, cards: approved } : d)),
              }
            : current,
        );
        return;
      }

      setRetryingIndex(index);
      setRetryError(null);
      try {
        const data = await buildLessonPlan({
          goal: t('regenerateGoal', {
            goal: form.goal,
            deck: deck.name,
            words: approved.map((c) => c.word).join('、') || t('regenerateNoWords'),
          }).slice(0, GOAL_MAX),
          weeks: 1,
          // Gemini's floor is CARDS_MIN even when fewer are actually needed;
          // the extras are trimmed off below.
          cardsPerDeck: Math.min(CARDS_MAX, Math.max(CARDS_MIN, needed)),
          documents: form.documents.map((d) => ({ path: d.path, mimeType: d.mimeType })),
          level: form.level,
          styleNotes: effectiveStyleNotes(form),
          groupId,
        });
        const generatedPlan = form.generateImages ? await attachPlanImages(data.plan) : data.plan;
        const fresh = (generatedPlan.decks[0]?.cards ?? []).slice(0, needed);
        setPlan((current) =>
          current
            ? {
                decks: current.decks.map((d, i) =>
                  i === index ? { ...d, cards: [...approved, ...fresh] } : d,
                ),
              }
            : current,
        );
        mergeWarmUpWords(data.warmUp ?? []);
      } catch (err) {
        setRetryError(err instanceof Error ? err.message : t('errorMessage'));
      } finally {
        setRetryingIndex(null);
      }
    },
    [plan, form, groupId, setPlan, mergeWarmUpWords, t],
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
            {plan && <PrintButtons plan={plan} warmUp={warmUp} kanaSets={companionSets} />}
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
              groupId,
              generateImages: form.generateImages,
            })
          }
        />
      )}

      {!results && !building && !applying && plan && (
        <ReviewStep
          plan={plan}
          warmUp={warmUp}
          knownWords={knownWords}
          kanaReadiness={kanaReadiness}
          assignKanaSets={assignKanaSets}
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
          onAssignKanaSetsChange={setAssignKanaSets}
          onCompanionSetsChange={setCompanionSets}
          onApply={() =>
            apply({
              groupId,
              firstDueDate: dueDate,
              requiredAccuracy: accuracy,
              requiredMode: mode,
              withSentences: form.withSentences,
              level: form.level,
              styleNotes: effectiveStyleNotes(form),
              kanaSets: assignKanaSets ? companionSets : [],
            })
          }
          onStartOver={reset}
        />
      )}
    </Box>
  );
}
