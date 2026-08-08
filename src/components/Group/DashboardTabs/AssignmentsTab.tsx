'use client';
import AddIcon from '@mui/icons-material/Add';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';

import type { Assignment } from '@/hooks/useAssignments';
import type { Deck } from '@/types/deck';

import { AssignmentsList } from '../AssignmentsList';
import { QuizScoresPanel } from '../QuizScoresPanel';
import { SectionCard } from '../SectionCard';

interface AssignmentsTabProps {
  assignments: Assignment[];
  onEditAssignments: (
    ids: string[],
    updates: { note?: string | null; dueDate?: string | null; availableOn?: string | null },
  ) => Promise<void>;
  onDeleteAssignments: (ids: string[]) => Promise<void>;
  canAssign: boolean;
  onAssign: () => void;
  ownDecks: Deck[];
  groupId: string;
}

export function AssignmentsTab({
  assignments,
  onEditAssignments,
  onDeleteAssignments,
  canAssign,
  onAssign,
  ownDecks,
  groupId,
}: AssignmentsTabProps) {
  const t = useTranslations('Group.groupPage');
  const theme = useTheme();
  const { brand } = theme.palette;

  return (
    <Stack spacing={2.5}>
      {canAssign && (
        <Box>
          <Button
            variant="outlined"
            startIcon={<AddIcon sx={{ fontSize: 18 }} />}
            onClick={onAssign}
            sx={{
              borderRadius: theme.radii.sm,
              textTransform: 'none',
              fontWeight: 700,
              borderColor: brand[400],
              color: brand[700],
            }}
          >
            {t('assignDeckButton')}
          </Button>
        </Box>
      )}

      <SectionCard title={t('assignmentsHeading')}>
        <AssignmentsList
          assignments={assignments}
          onEditBatch={onEditAssignments}
          onDeleteBatch={onDeleteAssignments}
        />
      </SectionCard>

      <QuizScoresPanel decks={ownDecks} groupId={groupId} />
    </Stack>
  );
}
