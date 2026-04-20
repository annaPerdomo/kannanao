'use client';
import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import { useTheme, alpha } from '@mui/material/styles';
import type { Todo } from '@/types/todo';
import { FrequencyPicker } from './FrequencyPicker';
import { toISODate } from './helpers';
import { StyledDialog } from '@/components/StyledDialog';

interface EditTodoDialogProps {
  open: boolean;
  onClose: () => void;
  todo: Todo | null;
  onSave: (id: string, text: string, frequencyDays: number[], assignedDate: string | null) => Promise<void>;
}

export function EditTodoDialog({ open, onClose, todo, onSave }: EditTodoDialogProps) {
  const { palette } = useTheme();
  const { brand, accent } = palette;

  const [text, setText] = useState('');
  const [frequencyDays, setFrequencyDays] = useState<number[]>([]);
  const [assignedDate, setAssignedDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (todo) {
      setText(todo.text);
      setFrequencyDays(todo.frequencyDays);
      setError(null);
      if (todo.frequencyDays.length === 0) {
        setAssignedDate(toISODate(new Date(todo.createdAt)));
      } else {
        setAssignedDate('');
      }
    }
  }, [todo]);

  const handleSave = async () => {
    if (!todo || !text.trim()) return;
    setSaving(true);
    try {
      const finalAssignedDate = frequencyDays.length === 0 ? assignedDate : null;
      await onSave(todo.id, text.trim(), frequencyDays, finalAssignedDate);
      onClose();
    } catch (err) {
      console.error('Failed to save todo:', err);
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!todo) return null;

  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      title="Edit Task"
      actions={
        <Stack direction="row" spacing={1}>
          <Button onClick={onClose} sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'none', fontSize: '0.875rem' }}>
            Cancel
          </Button>
          <Button
            onClick={handleSave} disabled={!text.trim() || saving} variant="contained"
            sx={{
              background: `linear-gradient(135deg, ${brand[400]}, ${accent[300]})`,
              color: 'white', fontWeight: 800, textTransform: 'none', fontSize: '0.875rem',
              px: 3, borderRadius: 2.5,
              boxShadow: `0 4px 12px ${alpha(brand[400], 0.3)}`,
              '&:hover': { background: `linear-gradient(135deg, ${brand[500]}, ${accent[400]})`, boxShadow: `0 6px 16px ${alpha(brand[400], 0.4)}` },
              '&:disabled': { background: alpha(brand[200], 0.3), color: alpha('#000', 0.3) },
            }}
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </Stack>
      }
    >
      <Stack spacing={2.5}>
        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ borderRadius: 2, fontSize: '0.78rem' }}>
            {error}
          </Alert>
        )}
        <TextField
          label="Task" value={text} onChange={(e) => setText(e.target.value)}
          fullWidth autoFocus multiline rows={2}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2, background: alpha('#fff', 0.6),
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: brand[400] },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: brand[500] },
            },
          }}
        />
        <Box>
          <FrequencyPicker value={frequencyDays} onChange={setFrequencyDays} />
        </Box>
        {frequencyDays.length === 0 && (
          <TextField
            label="Assigned Date" type="date" value={assignedDate}
            onChange={(e) => setAssignedDate(e.target.value)} fullWidth
            InputLabelProps={{ shrink: true }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2, background: alpha('#fff', 0.6),
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: brand[400] },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: brand[500] },
              },
            }}
          />
        )}
      </Stack>
    </StyledDialog>
  );
}
