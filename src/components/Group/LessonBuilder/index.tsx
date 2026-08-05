'use client';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';

import { Loading } from '@/components/Loading';
import { useAuth } from '@/contexts/AuthContext';
import { useGroupMembers } from '@/hooks/useGroup';
import { useLessonPlan } from '@/hooks/useLessonPlan';
import type { GoalMode } from '@/lib/assignmentMastery';
import { buildLessonPlan } from '@/services/api';
import { LAYOUT } from '@/theme';
import type { LessonDocument, PlanDeck } from '@/types/lessonPlan';

import { AskStep } from './AskStep';
import { DEFAULT_CARDS_PER_DECK, DEFAULT_WEEKS, nextSunday } from './constants';
import { ReviewStep } from './ReviewStep';

interface LessonBuilderProps {
  groupId: string;
}

/**
 * Ask → review → apply, on one page. Nothing is written until the organizer
 * presses "Create decks & assign", so a plan she doesn't like costs nothing.
 */
export function LessonBuilder({ groupId }: LessonBuilderProps) {
  const t = useTranslations('Group.lessonBuilder');
  const router = useRouter();
  const { isMemberAccount, loading: authLoading } = useAuth();
  const { members, loading: membersLoading } = useGroupMembers(groupId);
  const { plan, setPlan, knownWords, results, building, applying, error, build, apply, reset } =
    useLessonPlan();

  const [goal, setGoal] = useState('');
  const [memberId, setMemberId] = useState('');
  const [weeks, setWeeks] = useState<number>(DEFAULT_WEEKS);
  const [cardsPerDeck, setCardsPerDeck] = useState<number>(DEFAULT_CARDS_PER_DECK);
  const [referenceDocuments, setReferenceDocuments] = useState<LessonDocument[]>([]);
  const [dueDate, setDueDate] = useState(() => nextSunday());
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [mode, setMode] = useState<GoalMode | null>(null);
  // On by default: a deck without practice sentences is a deck Kotoba Bubble
  // can't open, and the organizer is right here to say no if they'd rather not
  // spend the calls.
  const [withSentences, setWithSentences] = useState(true);
  const [retryingIndex, setRetryingIndex] = useState<number | null>(null);
  const [retryError, setRetryError] = useState<string | null>(null);

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
          memberId,
          goal: t('retryGoal', { goal, deck: deck.name }),
          weeks: 1,
          cardsPerDeck: deck.cards?.length || cardsPerDeck,
          documents: referenceDocuments.map((d) => ({ base64: d.base64, mimeType: d.mimeType })),
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
    [plan, memberId, goal, cardsPerDeck, referenceDocuments, setPlan, t],
  );

  if (authLoading || membersLoading) return <Loading message={t('loadingMessage')} />;

  if (isMemberAccount) {
    return (
      <Container sx={{ py: 4, maxWidth: LAYOUT.contentMaxWidth }}>
        <Alert severity="error">{t('organizerOnly')}</Alert>
      </Container>
    );
  }

  const createdCount = results?.filter((r) => r.status === 'created').length ?? 0;
  const failed = results?.filter((r) => r.status === 'failed') ?? [];

  return (
    <Container sx={{ py: { xs: 3, sm: 4 }, maxWidth: LAYOUT.contentMaxWidth }}>
      <Stack spacing={1} sx={{ mb: 3 }}>
        <Typography component="h1" sx={{ fontWeight: 800, fontSize: '1.5rem' }}>
          {t('title')}
        </Typography>
        <Typography sx={{ color: 'text.secondary' }}>{t('subtitle')}</Typography>
      </Stack>

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
          <Box>
            <Button variant="contained" onClick={() => router.push(`/group/${groupId}`)}>
              {t('backToGroupButton')}
            </Button>
          </Box>
        </Stack>
      )}

      {!results && building && <Loading message={t('buildingMessage')} />}
      {!results && applying && <Loading message={t('applyingMessage')} />}

      {!results && !building && !applying && !plan && (
        <>
          {members.length === 0 ? (
            <Alert severity="info">{t('noLearners')}</Alert>
          ) : (
            <AskStep
              members={members}
              goal={goal}
              memberId={memberId}
              weeks={weeks}
              cardsPerDeck={cardsPerDeck}
              documents={referenceDocuments}
              onGoalChange={setGoal}
              onMemberChange={setMemberId}
              onWeeksChange={setWeeks}
              onCardsPerDeckChange={setCardsPerDeck}
              onDocumentsChange={setReferenceDocuments}
              onSubmit={() =>
                build({ memberId, goal, weeks, cardsPerDeck, documents: referenceDocuments })
              }
            />
          )}
        </>
      )}

      {!results && !building && !applying && plan && (
        <ReviewStep
          plan={plan}
          knownWords={knownWords}
          dueDate={dueDate}
          accuracy={accuracy}
          mode={mode}
          applying={applying}
          retryingIndex={retryingIndex}
          withSentences={withSentences}
          onDeckChange={handleDeckChange}
          onRetryDeck={handleRetryDeck}
          onDueDateChange={setDueDate}
          onAccuracyChange={setAccuracy}
          onModeChange={setMode}
          onWithSentencesChange={setWithSentences}
          onApply={() =>
            apply({
              groupId,
              memberId,
              firstDueDate: dueDate,
              requiredAccuracy: accuracy,
              requiredMode: mode,
              withSentences,
            })
          }
          onStartOver={reset}
        />
      )}
    </Container>
  );
}
