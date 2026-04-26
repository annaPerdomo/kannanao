'use client';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import type { Assignment } from '@/hooks/useAssignments';

function dueDateColor(dueDate: string | null): 'green' | 'orange' | 'red' | null {
  if (!dueDate) return null;
  const diff = new Date(dueDate).getTime() - Date.now();
  const days = diff / (24 * 60 * 60 * 1000);
  if (days < 0) return 'red';
  if (days < 3) return 'orange';
  return 'green';
}

function dueDateLabel(dueDate: string | null): string {
  if (!dueDate) return '';
  const diff = new Date(dueDate).getTime() - Date.now();
  const days = Math.ceil(diff / (24 * 60 * 60 * 1000));
  if (days < 0) return `Overdue by ${Math.abs(days)}d`;
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `Due in ${days}d`;
}

const DUE_COLORS = {
  green: { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.4)', text: '#16A34A' },
  orange: { bg: 'rgba(234,179,8,0.12)', border: 'rgba(234,179,8,0.4)', text: '#B45309' },
  red: { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.4)', text: '#DC2626' },
};

interface AssignmentCardProps {
  assignment: Assignment;
  onStudy: (deckId: string) => void;
}

export function AssignmentCard({ assignment, onStudy }: AssignmentCardProps) {
  const theme = useTheme();
  const { brand } = theme.palette;
  const isCompleted = !!assignment.completed_at;
  const deck = assignment.decks;
  const urgency = dueDateColor(assignment.due_date);

  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.5,
        border: `1.5px solid ${isCompleted ? alpha(brand[300], 0.25) : alpha(brand[300], 0.4)}`,
        borderRadius: 2.5,
        bgcolor: isCompleted ? alpha(brand[50], 0.3) : alpha(brand[50], 0.6),
        opacity: isCompleted ? 0.75 : 1,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
      }}
    >
      {/* Deck emoji */}
      <Typography sx={{ fontSize: '1.3rem', flexShrink: 0 }}>
        {isCompleted ? '✅' : deck?.emoji || '📚'}
      </Typography>

      {/* Content */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: '0.85rem',
            color: brand[800],
            textDecoration: isCompleted ? 'line-through' : 'none',
          }}
          noWrap
        >
          {deck?.name || 'Unknown Deck'}
        </Typography>
        {assignment.note && (
          <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', mt: 0.2 }} noWrap>
            {assignment.note}
          </Typography>
        )}
        {urgency && !isCompleted && (
          <Box
            sx={{
              display: 'inline-block',
              mt: 0.5,
              px: 0.75,
              py: 0.15,
              borderRadius: 1,
              fontSize: '0.62rem',
              fontWeight: 700,
              bgcolor: DUE_COLORS[urgency].bg,
              border: `1px solid ${DUE_COLORS[urgency].border}`,
              color: DUE_COLORS[urgency].text,
            }}
          >
            {dueDateLabel(assignment.due_date)}
          </Box>
        )}
      </Box>

      {/* Action */}
      {!isCompleted && (
        <Button
          size="small"
          variant="contained"
          startIcon={<PlayArrowIcon sx={{ fontSize: 14 }} />}
          onClick={() => onStudy(assignment.deck_id)}
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 700,
            fontSize: '0.72rem',
            px: 1.5,
            py: 0.5,
            flexShrink: 0,
          }}
        >
          Study
        </Button>
      )}
      {isCompleted && (
        <CheckCircleIcon sx={{ color: '#22C55E', fontSize: 20, flexShrink: 0 }} />
      )}
    </Paper>
  );
}
