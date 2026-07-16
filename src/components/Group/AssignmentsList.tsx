'use client';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/EditOutlined';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';

import type { Assignment } from '@/hooks/useAssignments';
import { goalLabel } from '@/lib/assignmentMastery';

import { EditAssignmentDialog } from './EditAssignmentDialog';

type Translator = ReturnType<typeof useTranslations>;

function dueDateColor(dueDate: string | null): 'green' | 'orange' | 'red' | null {
  if (!dueDate) return null;
  const diff = new Date(dueDate).getTime() - Date.now();
  const days = diff / (24 * 60 * 60 * 1000);
  if (days < 0) return 'red';
  if (days < 3) return 'orange';
  return 'green';
}

function dueDateLabel(dueDate: string | null, t: Translator): string {
  if (!dueDate) return '';
  const diff = new Date(dueDate).getTime() - Date.now();
  const days = Math.ceil(diff / (24 * 60 * 60 * 1000));
  if (days < 0) return t('overdueBy', { days: Math.abs(days) });
  if (days === 0) return t('dueToday');
  if (days === 1) return t('dueTomorrow');
  return t('dueInDays', { days });
}

function formatDate(dateStr: string, locale: string): string {
  return new Date(dateStr).toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
  });
}

const DUE_COLORS = {
  green: { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.4)', text: '#16A34A' },
  orange: { bg: 'rgba(234,179,8,0.12)', border: 'rgba(234,179,8,0.4)', text: '#B45309' },
  red: { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.4)', text: '#DC2626' },
};

interface AssignmentsListProps {
  assignments: Assignment[];
  onEdit: (id: string, updates: { note?: string; dueDate?: string | null }) => Promise<void>;
  onDelete: (id: string) => void;
}

export function AssignmentsList({ assignments, onEdit, onDelete }: AssignmentsListProps) {
  const theme = useTheme();
  const t = useTranslations('Group.assignmentsList');
  const { brand } = theme.palette;
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);

  const active = assignments.filter((a) => !a.completed_at);
  const completed = assignments.filter((a) => !!a.completed_at);

  if (assignments.length === 0) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 3,
          textAlign: 'center',
          border: `1.5px dashed ${alpha(brand[300], 0.4)}`,
          borderRadius: 3,
          bgcolor: alpha(brand[50], 0.6),
        }}
      >
        <Typography sx={{ fontSize: '1.5rem', mb: 0.5 }}>📋</Typography>
        <Typography sx={{ fontWeight: 700, color: brand[700], fontSize: '0.85rem' }}>
          {t('noAssignmentsTitle')}
        </Typography>
        <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
          {t('noAssignmentsBody')}
        </Typography>
      </Paper>
    );
  }

  return (
    <>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        {active.map((a) => (
          <AssignmentRow
            key={a.id}
            assignment={a}
            onEdit={() => setEditingAssignment(a)}
            onDelete={onDelete}
          />
        ))}
        {completed.length > 0 && (
          <>
            <Typography
              sx={{
                fontSize: '0.65rem',
                fontWeight: 700,
                color: 'text.secondary',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                mt: 1,
                mb: 0.25,
              }}
            >
              {t('completedCount', { count: completed.length })}
            </Typography>
            {completed.map((a) => (
              <AssignmentRow
                key={a.id}
                assignment={a}
                onEdit={() => setEditingAssignment(a)}
                onDelete={onDelete}
              />
            ))}
          </>
        )}
      </Box>

      <EditAssignmentDialog
        open={editingAssignment !== null}
        onClose={() => setEditingAssignment(null)}
        assignment={editingAssignment}
        onSave={onEdit}
      />
    </>
  );
}

function AssignmentRow({
  assignment,
  onEdit,
  onDelete,
}: {
  assignment: Assignment;
  onEdit: () => void;
  onDelete: (id: string) => void;
}) {
  const theme = useTheme();
  const t = useTranslations('Group.assignmentsList');
  const locale = useLocale();
  const { brand } = theme.palette;
  const isCompleted = !!assignment.completed_at;
  const deck = assignment.decks;
  const member = assignment.profiles;
  const urgency = !isCompleted ? dueDateColor(assignment.due_date) : null;
  const goal = goalLabel(assignment);
  const deckName = deck?.name || t('unknownDeck');

  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.25,
        border: `1px solid ${isCompleted ? alpha(brand[300], 0.2) : alpha(brand[300], 0.35)}`,
        borderRadius: 2.5,
        bgcolor: isCompleted ? alpha(brand[50], 0.25) : alpha(brand[50], 0.5),
        opacity: isCompleted ? 0.7 : 1,
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
      }}
    >
      {/* Deck emoji */}
      <Typography sx={{ fontSize: '1.1rem', flexShrink: 0 }}>
        {isCompleted ? '✅' : deck?.emoji || '📚'}
      </Typography>

      {/* Content */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          sx={{
            fontSize: '0.65rem',
            color: 'text.secondary',
          }}
          noWrap
        >
          <Box component="span" sx={{ fontWeight: 500 }}>
            {t('assignedToLabel')}
          </Box>{' '}
          <Box component="span" sx={{ fontWeight: 700, color: brand[600] }}>
            {member?.display_name || member?.username || t('unknownMember')}
          </Box>
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: '0.8rem',
              color: brand[800],
              textDecoration: isCompleted ? 'line-through' : 'none',
            }}
            noWrap
          >
            {deckName}
          </Typography>
          {assignment.due_date && (
            <>
              <Box
                component="span"
                sx={{
                  width: 3,
                  height: 3,
                  borderRadius: '50%',
                  bgcolor: alpha(brand[400], 0.5),
                  flexShrink: 0,
                }}
              />
              <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                {t('dueOn', { date: formatDate(assignment.due_date, locale) })}
              </Typography>
            </>
          )}
          {urgency && (
            <Box
              sx={{
                display: 'inline-block',
                px: 0.6,
                py: 0.1,
                borderRadius: 1,
                fontSize: '0.58rem',
                fontWeight: 700,
                bgcolor: DUE_COLORS[urgency].bg,
                border: `1px solid ${DUE_COLORS[urgency].border}`,
                color: DUE_COLORS[urgency].text,
              }}
            >
              {dueDateLabel(assignment.due_date, t)}
            </Box>
          )}
        </Box>
        {assignment.note && (
          <Typography
            sx={{ fontSize: '0.65rem', color: 'text.secondary', fontStyle: 'italic', mt: 0.25 }}
            noWrap
          >
            &ldquo;{assignment.note}&rdquo;
          </Typography>
        )}
        {goal && (
          <Typography
            sx={{ fontSize: '0.65rem', fontWeight: 600, color: 'text.primary', mt: 0.25 }}
            noWrap
          >
            {t('goalProgress', {
              goal,
              state:
                assignment.progress_accuracy == null ? 'none' : isCompleted ? 'reached' : 'best',
              accuracy: assignment.progress_accuracy ?? 0,
            })}
          </Typography>
        )}
      </Box>

      {/* Actions */}
      <Box sx={{ display: 'flex', gap: 0.25, flexShrink: 0 }}>
        <IconButton
          size="small"
          onClick={onEdit}
          aria-label={t('editAssignmentAria', { deckName })}
          sx={{
            color: alpha(brand[400], 0.6),
            '&:hover': { color: brand[600] },
          }}
        >
          <EditIcon sx={{ fontSize: 17 }} />
        </IconButton>
        <IconButton
          size="small"
          onClick={() => onDelete(assignment.id)}
          aria-label={t('removeAssignmentAria', { deckName })}
          sx={{
            color: alpha(brand[400], 0.6),
            '&:hover': { color: 'error.main' },
          }}
        >
          <DeleteOutlineIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>
    </Paper>
  );
}
