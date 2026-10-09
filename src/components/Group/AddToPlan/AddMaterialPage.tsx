'use client';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect } from 'react';

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

  useEffect(() => {
    if (!authLoading && isMemberAccount) router.push('/');
  }, [authLoading, isMemberAccount, router]);

  const group = groups.find((g) => g.id === groupId);
  const scopedGroups = group ? [group] : [];

  const goToLessons = useCallback(
    () => router.push(`/group/${groupId}?tab=lessons`),
    [router, groupId],
  );

  // A blank deck is now started from the Lessons tab's "New lesson" dialog —
  // this route only exists so old `/add/blank` links keep resolving.
  useEffect(() => {
    if (source === 'blank') router.replace(`/group/${groupId}?tab=lessons&new=1`);
  }, [source, router, groupId]);

  if (source === 'blank') {
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
      <PageHeader onBack={goToLessons} title={t(`${source}.title`)} subtitle={group.name} />

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
    </Box>
  );
}
