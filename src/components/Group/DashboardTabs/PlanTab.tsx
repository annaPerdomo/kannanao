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

interface PlanTabProps {
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
  canAssign: boolean;
  onAssign: () => void;
  ownDecks: Deck[];
  onSendEncouragement: (memberId: string, message: string, emoji?: string) => Promise<unknown>;
  members: GroupMember[];
  onAssignMissing: (batch: AssignmentBatch, memberIds: string[]) => void;
  onBuild: () => void;
  onChanged: () => void;
}

export function PlanTab({
  groupId,
  library,
  assignments,
  assignmentsLoading,
  assignmentsError,
  onEditAssignments,
  onDeleteAssignments,
  canAssign,
  onAssign,
  ownDecks,
  onSendEncouragement,
  members,
  onAssignMissing,
  onBuild,
  onChanged,
}: PlanTabProps) {
  const t = useTranslations('Group.planTab');
  const theme = useTheme();
  const { brand } = theme.palette;
  const router = useRouter();
  const libraryData = library.library;

  const kanaGoals = useMemo(() => assignments.filter((a) => a.deck_id == null), [assignments]);

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
          {t('planHeading')}
        </Typography>
        <Button
          variant="outlined"
          disabled={!canAssign}
          startIcon={<AddIcon sx={{ fontSize: 18 }} />}
          onClick={onAssign}
          sx={{ borderRadius: theme.radii.sm, textTransform: 'none', fontWeight: 700 }}
        >
          {t('handOutDeckButton')}
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
          <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', mb: 2 }}>
            {t('emptyBody')}
          </Typography>
          <Button variant="outlined" onClick={onBuild}>
            {t('addToPlanButton')}
          </Button>
        </Paper>
      ) : (
        <LessonLibrary
          groupId={groupId}
          onBuild={onBuild}
          onSwitchGroup={(id) => router.push(`/group/${id}?tab=plan`)}
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
