'use client';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

import { CreateDeckDialog } from '@/components/CreateDeckDialog';
import { DataErrorState } from '@/components/DataErrorState';
import { Loading } from '@/components/Loading';
import { KanaCourseBuilder } from '@/components/MaterialsBuilder/KanaCourseBuilder';
import { LessonSetBuilder } from '@/components/MaterialsBuilder/LessonSetBuilder';
import { QuizletImport } from '@/components/MaterialsBuilder/QuizletImport';
import { PageHeader } from '@/components/PageHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useGroups } from '@/hooks/useGroups';
import { LAYOUT } from '@/theme';

import type { AddSource } from './constants';

interface AddMaterialPageProps {
  groupId: string;
  source: Extract<AddSource, 'lesson' | 'kana' | 'quizlet' | 'blank'>;
}

const noop = () => {};

export function AddMaterialPage({ groupId, source }: AddMaterialPageProps) {
  const t = useTranslations('Group.addToPlan');
  const theme = useTheme();
  const { brand } = theme.palette;
  const router = useRouter();
  const { isMemberAccount, loading: authLoading } = useAuth();
  const {
    groups,
    loading: groupsLoading,
    error: groupsError,
    refetch: refetchGroups,
  } = useGroups();
  const [deckDialogOpen, setDeckDialogOpen] = useState(source === 'blank');
  const [createdDeckId, setCreatedDeckId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && isMemberAccount) router.push('/');
  }, [authLoading, isMemberAccount, router]);

  const group = groups.find((g) => g.id === groupId);
  const scopedGroups = group ? [group] : [];

  const goToPlan = useCallback(() => router.push(`/group/${groupId}?tab=plan`), [router, groupId]);

  const handOutDeck = useCallback(
    (deckId: string) => router.push(`/group/${groupId}?tab=plan&assign=${deckId}`),
    [router, groupId],
  );

  // A cancel before any deck exists just backs out. Once a deck exists,
  // closing (e.g. mid-flow, for the AI review step) must never navigate itself.
  useEffect(() => {
    if (source === 'blank' && !deckDialogOpen && !createdDeckId) goToPlan();
  }, [source, deckDialogOpen, createdDeckId, goToPlan]);

  if (authLoading || isMemberAccount || groupsLoading) {
    return (
      <Box
        sx={{
          maxWidth: LAYOUT.contentMaxWidth,
          mx: 'auto',
          px: LAYOUT.pagePx,
          py: { xs: 3, sm: 6 },
        }}
      >
        <Loading />
      </Box>
    );
  }

  if (groupsError) {
    return (
      <Box
        sx={{
          maxWidth: LAYOUT.contentMaxWidth,
          mx: 'auto',
          px: LAYOUT.pagePx,
          py: { xs: 3, sm: 6 },
        }}
      >
        <DataErrorState error={groupsError} onRetry={() => void refetchGroups()} />
      </Box>
    );
  }

  if (!group) {
    return (
      <Box
        sx={{
          maxWidth: LAYOUT.contentMaxWidth,
          mx: 'auto',
          px: LAYOUT.pagePx,
          py: { xs: 3, sm: 6 },
          textAlign: 'center',
        }}
      >
        <Typography sx={{ fontSize: '2rem', mb: 1 }}>🔍</Typography>
        <Typography sx={{ fontWeight: 700, color: brand[700], mb: 0.5 }}>
          {t('groupNotFoundTitle')}
        </Typography>
        <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', mb: 2 }}>
          {t('groupNotFoundBody')}
        </Typography>
        <Button variant="contained" onClick={() => router.push('/group')}>
          {t('backToGroupsButton')}
        </Button>
      </Box>
    );
  }

  return (
    <Box
      sx={{ maxWidth: LAYOUT.contentMaxWidth, mx: 'auto', px: LAYOUT.pagePx, py: { xs: 3, sm: 5 } }}
    >
      <PageHeader onBack={goToPlan} title={t(`${source}.title`)} subtitle={group.name} />

      {source === 'lesson' && (
        <LessonSetBuilder
          groups={scopedGroups}
          groupId={groupId}
          onGroupChange={noop}
          hideGroupSelect
        />
      )}

      {source === 'kana' && (
        <KanaCourseBuilder
          groups={scopedGroups}
          groupId={groupId}
          onGroupChange={noop}
          hideGroupSelect
        />
      )}

      {source === 'quizlet' && (
        <QuizletImport
          groups={scopedGroups}
          groupId={groupId}
          onGroupChange={noop}
          hideGroupSelect
        />
      )}

      {source === 'blank' && (
        <>
          {!deckDialogOpen && createdDeckId && (
            <Alert
              severity="info"
              sx={{
                mb: 2,
                bgcolor: alpha(brand[100], 0.5),
                color: 'text.primary',
                '& .MuiAlert-icon': { color: brand[700] },
              }}
              action={
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handOutDeck(createdDeckId)}
                  sx={{ whiteSpace: 'nowrap' }}
                >
                  {t('handItOutButton')}
                </Button>
              }
            >
              {t('savedNotHandedOut')}
            </Alert>
          )}
          <CreateDeckDialog
            open={deckDialogOpen}
            onClose={() => setDeckDialogOpen(false)}
            onDeckStarted={setCreatedDeckId}
            onDeckCreated={handOutDeck}
          />
        </>
      )}
    </Box>
  );
}
