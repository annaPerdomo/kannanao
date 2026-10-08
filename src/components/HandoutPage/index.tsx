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

import { LearnerWordList } from '@/components/Group/HandoutDetailDialog/LearnerWordList';
import { SectionCard } from '@/components/Group/SectionCard';
import { Loading } from '@/components/Loading';
import { ShiftDialog } from '@/components/MaterialsBuilder/LessonLibrary/ShiftDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useAssignments } from '@/hooks/useAssignments';
import { useGroups } from '@/hooks/useGroups';
import { useHandoutWordEdits } from '@/hooks/useHandoutWordEdits';
import { useHandoutWords } from '@/hooks/useHandoutWords';
import { LESSON_LIBRARY_CACHE_PREFIX, useLessonLibrary } from '@/hooks/useLessonLibrary';
import { invalidateApiCache } from '@/lib/apiCache';
import type { HandoutLearnerSummary } from '@/lib/handoutWords';
import { handoutPagePath, locateWeek } from '@/lib/lessonUnits';
import { LAYOUT } from '@/theme';
import type { HandoutPatch } from '@/types/lessonUnit';

import type { ViewMember } from './constants';
import { HandoutHeader } from './HandoutHeader';
import { HandoutSettings } from './HandoutSettings';
import { HandoutWordsPanel } from './HandoutWordsPanel';
import { LearnersPanel } from './LearnersPanel';

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
  const [viewMember, setViewMember] = useState<ViewMember | null>(null);
  const [shiftOpen, setShiftOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [toastSeverity, setToastSeverity] = useState<'success' | 'error'>('success');
  const [leaving, setLeaving] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  const backHref = `/materials?tab=assigned&group=${groupId}`;
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
      {groupName ? t('backToAssignedIn', { group: groupName }) : t('backToAssigned')}
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

  return (
    <Container sx={{ py: LAYOUT.pagePy, maxWidth: LAYOUT.contentMaxWidth }}>
      {backButton}
      <HandoutHeader located={located} hrefFor={hrefFor} cards={cards} />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1fr) 360px' },
          gap: 2.5,
          mt: 2.5,
          alignItems: 'start',
        }}
      >
        <Box id="handout-words" sx={{ scrollMarginTop: 80 }}>
          {viewMember ? (
            <SectionCard title={t('learnerViewTitle', { name: viewMember.name })}>
              <LearnerWordList
                groupId={groupId}
                deckId={deckId}
                memberId={viewMember.id}
                memberName={viewMember.name}
                requiredMode={week.requiredMode}
                onBack={() => setViewMember(null)}
                scroll={false}
              />
            </SectionCard>
          ) : (
            <HandoutWordsPanel
              deckId={deckId}
              data={words.data}
              loading={words.loading}
              error={words.error}
              edits={edits}
              onSaved={showToast}
            />
          )}
        </Box>

        <Stack spacing={2.5} sx={{ position: { md: 'sticky' }, top: { md: 88 } }}>
          {words.data?.learners ? (
            <LearnersPanel
              groupId={groupId}
              learners={words.data.learners}
              selectedId={viewMember?.id ?? null}
              onSelect={handleSelectLearner}
              onAssign={handleAssign}
              assigningId={assigningId}
            />
          ) : (
            words.loading && (
              <SectionCard title={t('learnersLoading')}>
                <Loading />
              </SectionCard>
            )
          )}
          <HandoutSettings
            key={deckId}
            week={week}
            groupName={groupName}
            saving={library.saving}
            onSave={handleSave}
            onRemove={handleRemove}
            onShift={unit ? () => setShiftOpen(true) : undefined}
          />
        </Stack>
      </Box>

      <ShiftDialog
        open={shiftOpen}
        onClose={() => setShiftOpen(false)}
        unit={unit}
        week={week}
        saving={library.saving}
        onShift={handleShift}
      />

      <Snackbar open={toast != null} autoHideDuration={3000} onClose={() => setToast(null)}>
        <Alert severity={toastSeverity} onClose={() => setToast(null)} sx={{ width: '100%' }}>
          {toast}
        </Alert>
      </Snackbar>
    </Container>
  );
}
