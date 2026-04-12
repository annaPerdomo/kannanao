'use client';
import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { useTheme, alpha } from '@mui/material/styles';
import type { Todo } from '@/types/todo';
import { FrequencyPicker } from './FrequencyPicker';
import { toISODate } from './helpers';

interface EditTodoDialogProps {
  open: boolean;
  onClose: () => void;
  todo: Todo | null;
  onSave: (id: string, text: string, frequencyDays: number[], assignedDate: string | null) => Promise<void>;
}

export function EditTodoDialog({ open, onClose, todo, onSave }: EditTodoDialogProps) {
  const theme = useTheme();
  const { brand, accent } = theme.palette;

  const [text, setText] = useState('');
  const [frequencyDays, setFrequencyDays] = useState<number[]>([]);
  const [assignedDate, setAssignedDate] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (todo) {
      setText(todo.text);
      setFrequencyDays(todo.frequencyDays);
      // If it's a single-day task, show the created date
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
      // For recurring tasks, don't send assignedDate
      const finalAssignedDate = frequencyDays.length === 0 ? assignedDate : null;
      await onSave(todo.id, text.trim(), frequencyDays, finalAssignedDate);
      onClose();
    } catch (error) {
      console.error('Failed to save todo:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!todo) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          background: `linear-gradient(160deg, ${alpha(brand[50], 0.95)} 0%, ${alpha(accent[50], 0.85)} 100%)`,
          border: `2px solid ${alpha(brand[300], 0.25)}`,
          boxShadow: `0 8px 32px ${alpha(brand[300], 0.2)}`,
        },
      }}
    >
      <DialogTitle sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        pb: 1,
        fontWeight: 800,
        background: `linear-gradient(90deg, ${brand[700]} 0%, ${accent[500]} 100%)`,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }}>
        Edit Task
        <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary' }}>
          <CloseRoundedIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <Stack spacing={2.5}>
          {/* Task text */}
          <TextField
            label="Task"
            value={text}
            onChange={(e) => setText(e.target.value)}
            fullWidth
            autoFocus
            multiline
            rows={2}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                background: alpha('#fff', 0.6),
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: brand[400] },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: brand[500] },
              },
            }}
          />

          {/* Frequency picker */}
          <Box>
            <FrequencyPicker
              value={frequencyDays}
              onChange={setFrequencyDays}
            />
          </Box>

          {/* Single-day date picker (only shown if no frequency) */}
          {frequencyDays.length === 0 && (
            <TextField
              label="Assigned Date"
              type="date"
              value={assignedDate}
              onChange={(e) => setAssignedDate(e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  background: alpha('#fff', 0.6),
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: brand[400] },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: brand[500] },
                },
              }}
            />
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1 }}>
        <Button
          onClick={onClose}
          sx={{
            color: 'text.secondary',
            fontWeight: 700,
            textTransform: 'none',
            fontSize: '0.875rem',
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={!text.trim() || saving}
          variant="contained"
          sx={{
            background: `linear-gradient(135deg, ${brand[400]}, ${accent[300]})`,
            color: 'white',
            fontWeight: 800,
            textTransform: 'none',
            fontSize: '0.875rem',
            px: 3,
            borderRadius: 2.5,
            boxShadow: `0 4px 12px ${alpha(brand[400], 0.3)}`,
            '&:hover': {
              background: `linear-gradient(135deg, ${brand[500]}, ${accent[400]})`,
              boxShadow: `0 6px 16px ${alpha(brand[400], 0.4)}`,
            },
            '&:disabled': {
              background: alpha(brand[200], 0.3),
              color: alpha('#000', 0.3),
            },
          }}
        >
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
