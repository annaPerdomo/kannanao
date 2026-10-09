'use client';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { ShiftDialog } from '@/components/LessonLibrary/ShiftDialog';
import { Loading } from '@/components/Loading';
import { useAuth } from '@/contexts/AuthContext';
import { useAssignments } from '@/hooks/useAssignments';
import { useEncouragements } from '@/hooks/useEncouragements';
import { useGroups } from '@/hooks/useGroups';
import { useHandoutWordEdits } from '@/hooks/useHandoutWordEdits';
import { useHandoutWords } from '@/hooks/useHandoutWords';
import { LESSON_LIBRARY_CACHE_PREFIX, useLessonLibrary } from '@/hooks/useLessonLibrary';
import { invalidateApiCache } from '@/lib/apiCache';
import type { HandoutLearnerSummary } from '@/lib/handoutWords';
import { kanaSetLabel } from '@/lib/lessonKana';
import { handoutPagePath, locateWeek } from '@/lib/lessonUnits';
import { LAYOUT } from '@/theme';
import type { HandOutLessonResult, HandoutPatch } from '@/types/lessonUnit';

import type { ViewMember } from './constants';
import { DraftBanner } from './DraftBanner';
import { HandOutDialog } from './HandOutDialog';
import { HandoutHeader } from './HandoutHeader';
import { HandoutPageBody } from './HandoutPageBody';

interface HandoutPageProps {
  groupId: string;
  deckId: string;
}

export function HandoutPage({ groupId, deckId }: HandoutPageProps) {
  const t = useTranslations('Materials.handoutPage');
  const tLib = useTranslations('Materials.library');
  const router = useRouter();
  const { isMemberAccount, loading: authLoading } = useAuth();
  const { groups } = useGroups();
  const library = useLessonLibrary(groupId);
  const words = useHandoutWords({ groupId, deckId, enabled: true });
  const edits = useHandoutWordEdits({ deckId, mutate: words.mutate, refetch: words.refetch });
  const { createAssignment } = useAssignments(groupId);
  const { sendEncouragement } = useEncouragements();
  const [viewMember, setViewMember] = useState<ViewMember | null>(null);
  const [shiftOpen, setShiftOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [toastSeverity, setToastSeverity] = useState<'success' | 'error' | 'warning'>('success');
  const [leaving, setLeaving] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [handOutOpen, setHandOutOpen] = useState(false);

  const backHref = `/group/${groupId}?tab=lessons`;
  const groupName = groups.find((g) => g.id === groupId)?.name ?? '';
  const located = useMemo(() => locateWeek(library.library, deckId), [library.library, deckId]);
  const cards = useMemo(() => words.data?.words.map((w) => w.card) ?? [], [words.data]);

  useEffect(() => {
    if (!authLoading && isMemberAccount) router.push('/');
  }, [authLoading, isMemberAccount, router]);

  useEffect(() => setViewMember(null), [deckId]);

  const hrefFor = useCallback((id: string) => handoutPagePath(groupId, id), [groupId]);

  const handleSelectLearner = useCallback((learner: HandoutLearnerSummary) => {
    setViewMember((current) =>
      current?.id === learner.id ? null : { id: learner.id, name: learner.name },
    );
    document.getElementById('handout-words')?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const showToast = (message: string) => {
    setToastSeverity('success');
    setToast(message);
  };

  const handleSoundsSaved = (message: string) => {
    showToast(message);
    void library.refetch();
  };

  const handleHandOutDone = async (result: HandOutLessonResult) => {
    setHandOutOpen(false);
    if (result.kanaFailed.length > 0) {
      setToastSeverity('warning');
      setToast(t('kanaFailedToast', { list: result.kanaFailed.map(kanaSetLabel).join(', ') }));
    } else if (result.sentences === 'failed') {
      setToastSeverity('warning');
      setToast(t('sentencesFailedToast'));
    } else {
      showToast(t('handedOutToast'));
    }
    await library.refetch();
    await words.refetch();
  };

  const handleSave = async (patch: HandoutPatch) => {
    const ok = await library.editWeek(deckId, patch);
    if (ok) showToast(tLib('savedToast'));
    return ok;
  };

  const handleRemove = async () => {
    setLeaving(true);
    const ok = await library.removeWeek(deckId);
    if (ok) router.push(backHref);
    else setLeaving(false);
    return ok;
  };

  const handleShift = async (planId: string, fromDeckId: string, days: number) => {
    const ok = await library.shiftFrom(planId, fromDeckId, days);
    if (ok) showToast(tLib('movedToast'));
    return ok;
  };

  const handleAssign = async (learner: HandoutLearnerSummary) => {
    const week = located?.week;
    if (!week) return;
    setAssigningId(learner.id);
    try {
      await createAssignment({
        memberIds: [learner.id],
        deckId,
        title: week.title ?? undefined,
        note: week.note ?? undefined,
        dueDate: week.dueDate ?? undefined,
        availableOn: week.availableOn ?? undefined,
        requiredAccuracy: week.requiredAccuracy ?? undefined,
        requiredMode: week.requiredMode ?? undefined,
      });
      words.mutate((data) => ({
        ...data,
        learners:
          data.learners?.map((l) => (l.id === learner.id ? { ...l, assigned: true } : l)) ?? null,
      }));
      invalidateApiCache(LESSON_LIBRARY_CACHE_PREFIX);
      await words.refetch();
      setToastSeverity('success');
      setToast(t('assignedToast', { name: learner.name }));
    } catch {
      invalidateApiCache(LESSON_LIBRARY_CACHE_PREFIX);
      await words.refetch();
      setToastSeverity('error');
      setToast(t('assignError'));
    } finally {
      setAssigningId(null);
    }
  };

  if (leaving || authLoading || isMemberAccount || (library.loading && !library.library)) {
    return <Loading />;
  }

  const backButton = (
    <Button
      component={Link}
      href={backHref}
      startIcon={<ArrowBackIcon />}
      sx={{ textTransform: 'none', fontWeight: 700, mb: 1.5, alignSelf: 'flex-start' }}
    >
      {groupName ? t('backToPlanIn', { group: groupName }) : t('backToPlan')}
    </Button>
  );

  if (library.error || !located) {
    return (
      <Container sx={{ py: LAYOUT.pagePy, maxWidth: LAYOUT.contentMaxWidth }}>
        <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
          {backButton}
          <Alert severity={library.error ? 'error' : 'info'}>
            {library.error ?? t('notFound')}
          </Alert>
          {library.error && (
            <Button variant="contained" onClick={() => void library.refetch()}>
              {tLib('retry')}
            </Button>
          )}
        </Stack>
      </Container>
    );
  }

  const { week, unit } = located;
  const isDraft = week.status === 'draft';
  const learnerCount = words.data?.learners?.length ?? words.data?.learnerCount ?? 0;

  return (
    <Container sx={{ py: LAYOUT.pagePy, maxWidth: LAYOUT.contentMaxWidth }}>
      {backButton}
      <HandoutHeader located={located} hrefFor={hrefFor} cards={cards} />

      {isDraft && (
        <Box sx={{ mt: 2.5 }}>
          <DraftBanner
            learnerCount={learnerCount}
            canHandOut={cards.length > 0}
            onHandOut={() => setHandOutOpen(true)}
            onDelete={handleRemove}
          />
        </Box>
      )}

      <HandoutPageBody
        groupId={groupId}
        deckId={deckId}
        week={week}
        unit={unit}
        isDraft={isDraft}
        cards={cards}
        viewMember={viewMember}
        onSetViewMember={setViewMember}
        words={words}
        edits={edits}
        onWordsSaved={showToast}
        onSoundsSaved={handleSoundsSaved}
        onSelectLearner={handleSelectLearner}
        onAssign={handleAssign}
        assigningId={assigningId}
        onSendEncouragement={sendEncouragement}
        groupName={groupName}
        savingSchedule={library.saving}
        onSaveSchedule={handleSave}
        onRemoveWeek={handleRemove}
        onShift={() => setShiftOpen(true)}
      />

      <ShiftDialog
        open={shiftOpen}
        onClose={() => setShiftOpen(false)}
        unit={unit}
        week={week}
        saving={library.saving}
        onShift={handleShift}
      />

      <HandOutDialog
        open={handOutOpen}
        onClose={() => setHandOutOpen(false)}
        groupId={groupId}
        deckId={deckId}
        groupName={groupName}
        wordCount={cards.length}
        kanaSets={week.kanaSets}
        onDone={(result) => void handleHandOutDone(result)}
      />

      <Snackbar open={toast != null} autoHideDuration={3000} onClose={() => setToast(null)}>
        <Alert severity={toastSeverity} onClose={() => setToast(null)} sx={{ width: '100%' }}>
          {toast}
        </Alert>
      </Snackbar>
    </Container>
  );
}
