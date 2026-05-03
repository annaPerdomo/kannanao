'use client';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useEffect, useState } from 'react';

import { StyledDialog } from '@/components/StyledDialog';
import type { Assignment } from '@/hooks/useAssignments';

interface EditAssignmentDialogProps {
  open: boolean;
  onClose: () => void;
  assignment: Assignment | null;
  onSave: (id: string, updates: { note?: string; dueDate?: string | null }) => Promise<void>;
}

export function EditAssignmentDialog({
  open,
  onClose,
  assignment,
  onSave,
}: EditAssignmentDialogProps) {
  const theme = useTheme();
  const { brand, accent } = theme.palette;

  const [note, setNote] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (assignment) {
      setNote(assignment.note ?? '');
      setDueDate(assignment.due_date ?? '');
      setError(null);
    }
  }, [assignment]);

  const handleSave = async () => {
    if (!assignment) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(assignment.id, {
        note: note.trim() || undefined,
        dueDate: dueDate || null,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update assignment');
    } finally {
      setSaving(false);
    }
  };

  if (!assignment) return null;

  const deck = assignment.decks;
  const member = assignment.profiles;

  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      title="Edit Assignment"
      subtitle={`${deck?.emoji || '📚'} ${deck?.name || 'Deck'} — ${member?.display_name || member?.username || 'Member'}`}
      maxWidth="sm"
      actions={
        <>
          <Button
            onClick={onClose}
            disabled={saving}
            sx={{ textTransform: 'none', color: 'text.secondary' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={14} sx={{ color: 'white' }} /> : undefined}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              borderRadius: '10px',
              background: `linear-gradient(135deg, ${brand[400]}, ${accent[300]})`,
              '&:hover': { background: `linear-gradient(135deg, ${brand[500]}, ${accent[400]})` },
            }}
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </>
      }
    >
      <Stack spacing={2}>
        {error && <Typography sx={{ color: 'error.main', fontSize: '0.8rem' }}>{error}</Typography>}

        <TextField
          label="Note (optional)"
          placeholder="Focus on chapter 3 vocab"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          size="small"
          fullWidth
          multiline
          rows={2}
          slotProps={{ htmlInput: { maxLength: 500 } }}
        />

        <TextField
          label="Due Date (optional)"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          size="small"
          fullWidth
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              background: alpha('#fff', 0.6),
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: brand[400] },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: brand[500] },
            },
          }}
        />
      </Stack>
    </StyledDialog>
  );
}
