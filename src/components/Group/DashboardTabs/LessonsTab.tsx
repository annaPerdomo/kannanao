'use client';
import AddIcon from '@mui/icons-material/Add';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { LessonLibrary } from '@/components/LessonLibrary';
import type { Assignment } from '@/hooks/useAssignments';
import type { GroupMember } from '@/hooks/useGroup';
import type { LessonLibraryHook } from '@/hooks/useLessonLibrary';
import type { Deck } from '@/types/deck';

import { type AssignmentBatch, AssignmentsList } from '../AssignmentsList';
import { QuizScoresPanel } from '../QuizScoresPanel';
import { SectionCard } from '../SectionCard';

interface LessonsTabProps {
  groupId: string;
  library: LessonLibraryHook;
  assignments: Assignment[];
  assignmentsLoading: boolean;
  assignmentsError: string | null;
  onEditAssignments: (
    ids: string[],
    updates: { note?: string | null; dueDate?: string | null; availableOn?: string | null },
  ) => Promise<void>;
  onDeleteAssignments: (ids: string[]) => Promise<void>;
  ownDecks: Deck[];
  onSendEncouragement: (memberId: string, message: string, emoji?: string) => Promise<unknown>;
  members: GroupMember[];
  onAssignMissing: (batch: AssignmentBatch, memberIds: string[]) => void;
  onBuild: () => void;
  onChanged: () => void;
}

function coveredKanaSets(library: LessonLibraryHook['library']): Set<string> {
  const covered = new Set<string>();
  if (!library) return covered;
  for (const unit of library.units) {
    for (const week of unit.weeks) {
      for (const setId of week.kanaSets) covered.add(setId);
    }
  }
  for (const week of library.loose) {
    for (const setId of week.kanaSets) covered.add(setId);
  }
  return covered;
}

export function LessonsTab({
  groupId,
  library,
  assignments,
  assignmentsLoading,
  assignmentsError,
  onEditAssignments,
  onDeleteAssignments,
  ownDecks,
  onSendEncouragement,
  members,
  onAssignMissing,
  onBuild,
  onChanged,
}: LessonsTabProps) {
  const t = useTranslations('Group.lessonsTab');
  const theme = useTheme();
  const { brand } = theme.palette;
  const router = useRouter();
  const libraryData = library.library;

  const coveredSets = useMemo(() => coveredKanaSets(libraryData), [libraryData]);
  const kanaGoals = useMemo(
    () => assignments.filter((a) => a.deck_id == null && !coveredSets.has(a.kana_set ?? '')),
    [assignments, coveredSets],
  );

  const isEmpty =
    !!libraryData &&
    libraryData.units.length === 0 &&
    libraryData.loose.length === 0 &&
    kanaGoals.length === 0 &&
    !assignmentsLoading &&
    !assignmentsError;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, sm: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Typography
          component="h2"
          sx={{
            fontWeight: 800,
            fontSize: { xs: '1.05rem', sm: '1.15rem' },
            color: 'text.primary',
          }}
        >
          {t('heading')}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon sx={{ fontSize: 18 }} />}
          onClick={onBuild}
          sx={{ flexShrink: 0 }}
        >
          {t('newLessonButton')}
        </Button>
      </Box>

      {isEmpty ? (
        <Paper
          elevation={0}
          sx={{
            p: 3,
            textAlign: 'center',
            border: `1.5px dashed ${alpha(brand[300], 0.4)}`,
            borderRadius: theme.radii.md,
            bgcolor: alpha(brand[50], 0.6),
          }}
        >
          <Typography sx={{ fontSize: '1.5rem', mb: 0.5 }}>🌱</Typography>
          <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
            {t('emptyBody')}
          </Typography>
        </Paper>
      ) : (
        <LessonLibrary
          groupId={groupId}
          onBuild={onBuild}
          onSwitchGroup={(id) => router.push(`/group/${id}?tab=lessons`)}
          library={library}
          hideEmptyState
          onChanged={onChanged}
        />
      )}

      {(assignmentsError || kanaGoals.length > 0) && (
        <SectionCard title={t('kanaGoalsHeading')}>
          {assignmentsError ? (
            <Alert severity="error">{assignmentsError}</Alert>
          ) : (
            <AssignmentsList
              assignments={kanaGoals}
              onEditBatch={onEditAssignments}
              onDeleteBatch={onDeleteAssignments}
              onSendEncouragement={onSendEncouragement}
              members={members}
              onAssignMissing={onAssignMissing}
              groupId={groupId}
            />
          )}
        </SectionCard>
      )}

      <QuizScoresPanel decks={ownDecks} groupId={groupId} />
    </Box>
  );
}
