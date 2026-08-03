'use client';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { StyledDialog } from '@/components/StyledDialog';
import type { Assignment } from '@/hooks/useAssignments';

import { EditAssignmentDialog } from '../EditAssignmentDialog';
import { ShowMoreButton } from '../ShowMoreButton';
import { BatchRow } from './BatchRow';
import { type AssignmentBatch, groupAssignments } from './groupAssignments';

export { type AssignmentBatch, groupAssignments } from './groupAssignments';

interface AssignmentsListProps {
  assignments: Assignment[];
  /** Batch actions cover every copy of a handout; both must reject on failure. */
  onEditBatch: (
    ids: string[],
    updates: { note?: string; dueDate?: string | null },
  ) => Promise<void>;
  onDeleteBatch: (ids: string[]) => Promise<void>;
  maxVisible?: number;
}

export function AssignmentsList({
  assignments,
  onEditBatch,
  onDeleteBatch,
  maxVisible,
}: AssignmentsListProps) {
  const theme = useTheme();
  const t = useTranslations('Group.assignmentsList');
  const tc = useTranslations('Common');
  const { brand } = theme.palette;
  const [editing, setEditing] = useState<AssignmentBatch | null>(null);
  const [removing, setRemoving] = useState<AssignmentBatch | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const batches = groupAssignments(assignments);
  const collapsed = maxVisible !== undefined && !expanded && batches.length > maxVisible;
  const visible = collapsed ? batches.slice(0, maxVisible) : batches;

  const closeRemoveDialog = () => {
    if (deleting) return;
    setRemoving(null);
    setDeleteError(null);
  };

  const handleDelete = async () => {
    if (!removing) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await onDeleteBatch(removing.ids);
      setRemoving(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : t('removeFailed'));
    } finally {
      setDeleting(false);
    }
  };

  if (assignments.length === 0) {
    return (
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
        <Typography sx={{ fontSize: '1.5rem', mb: 0.5 }}>📋</Typography>
        <Typography sx={{ fontWeight: 700, color: 'text.primary', fontSize: '0.88rem' }}>
          {t('noAssignmentsTitle')}
        </Typography>
        <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
          {t('noAssignmentsBody')}
        </Typography>
      </Paper>
    );
  }

  return (
    <>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        {visible.map((batch) => (
          <BatchRow
            key={batch.key}
            batch={batch}
            onEdit={() => setEditing(batch)}
            onDelete={() => {
              setRemoving(batch);
              setDeleteError(null);
            }}
          />
        ))}
      </Box>

      {maxVisible !== undefined && batches.length > maxVisible && (
        <ShowMoreButton
          expanded={expanded}
          total={batches.length}
          onClick={() => setExpanded((v) => !v)}
        />
      )}

      <EditAssignmentDialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        assignment={editing?.sample ?? null}
        memberCount={editing?.total ?? 1}
        onSave={async (_id, updates) => {
          await onEditBatch(editing?.ids ?? [], updates);
        }}
      />

      <StyledDialog
        open={removing !== null}
        onClose={closeRemoveDialog}
        title={t('removeTitle')}
        actions={
          <>
            <Button onClick={closeRemoveDialog} disabled={deleting} sx={{ textTransform: 'none' }}>
              {tc('cancel')}
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleDelete}
              disabled={deleting}
              sx={{ textTransform: 'none' }}
            >
              {tc('delete')}
            </Button>
          </>
        }
      >
        <Typography sx={{ fontSize: '0.9rem' }}>
          {t('removeBody', {
            deck: removing?.deckName ?? t('unknownDeck'),
            count: removing?.total ?? 0,
          })}
        </Typography>
        {deleteError && (
          <Alert severity="error" sx={{ mt: 1.5 }}>
            {deleteError}
          </Alert>
        )}
      </StyledDialog>
    </>
  );
}
