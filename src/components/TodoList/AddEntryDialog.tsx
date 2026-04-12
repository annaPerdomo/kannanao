'use client';
import { useState, useEffect, useCallback } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Collapse from '@mui/material/Collapse';
import Alert from '@mui/material/Alert';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import ExpandLessRoundedIcon from '@mui/icons-material/ExpandLessRounded';
import { useTheme, alpha } from '@mui/material/styles';
import type { CalendarEntry, EntryType } from '@/types/todo';
import { DEFAULT_ENTRY_TYPES, getEntryType, toISODate } from './helpers';
import { FrequencyPicker } from './FrequencyPicker';

interface AddEntryDialogProps {
  open: boolean;
  onClose: () => void;
  selectedDate: Date;
  allEntryTypes: EntryType[];
  onAddEntry: (entry: CalendarEntry) => void;
}

export function AddEntryDialog({
  open, onClose, selectedDate, allEntryTypes, onAddEntry,
}: AddEntryDialogProps) {
  const theme = useTheme();
  const { brand, accent } = theme.palette;

  const [title, setTitle] = useState('');
  const [typeId, setTypeId] = useState(DEFAULT_ENTRY_TYPES[0].id);
  const [startDate, setStartDate] = useState<Dayjs | null>(dayjs(selectedDate));
  const [endDate, setEndDate] = useState<Dayjs | null>(dayjs(selectedDate));
  const [frequencyDays, setFrequencyDays] = useState<number[]>([]);
  const [showMore, setShowMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTitle('');
      setTypeId(DEFAULT_ENTRY_TYPES[0].id);
      setStartDate(dayjs(selectedDate));
      setEndDate(dayjs(selectedDate));
      setFrequencyDays([]);
      setShowMore(false);
      setError(null);
    }
  }, [open, selectedDate]);

  const handleSave = useCallback(() => {
    if (!title.trim()) return;
    setError(null);
    try {
      const type = getEntryType(typeId, allEntryTypes);
      const startISO = startDate ? toISODate(startDate.toDate()) : toISODate(selectedDate);
      const endISO = endDate ? toISODate(endDate.toDate()) : startISO;
      const safeEnd = endISO >= startISO ? endISO : startISO;
      const newEntry: CalendarEntry = {
        id: crypto.randomUUID(),
        title: title.trim(),
        typeId: type.id,
        emoji: type.emoji,
        color: type.color,
        startDateISO: startISO,
        endDateISO: safeEnd,
        frequencyDays,
      };
      onAddEntry(newEntry);
      onClose();
    } catch {
      setError('Could not add entry. Please try again.');
    }
  }, [title, typeId, startDate, endDate, frequencyDays, allEntryTypes, selectedDate, onAddEntry, onClose]);

  const datePickerSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: 2.5,
      background: alpha('#fff', 0.7),
      fontSize: '0.85rem',
      '& fieldset': { borderColor: alpha(brand[300], 0.4) },
      '&:hover fieldset': { borderColor: brand[400] },
      '&.Mui-focused fieldset': { borderColor: brand[500] },
    },
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          background: `linear-gradient(160deg, ${alpha(brand[50], 0.98)} 0%, ${alpha(accent[50], 0.92)} 100%)`,
          border: `2px solid ${alpha(brand[300], 0.2)}`,
          boxShadow: `0 12px 40px ${alpha(brand[400], 0.18)}, 0 4px 12px ${alpha(accent[200], 0.12)}`,
        },
      }}
    >
      <DialogTitle sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        pb: 0.5, pt: 2.5, px: 3,
      }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography sx={{ fontSize: '1.25rem' }}>📅</Typography>
          <Typography sx={{
            fontWeight: 800, fontSize: '1.05rem',
            background: `linear-gradient(90deg, ${brand[700]}, ${accent[500]})`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            Add to Calendar
          </Typography>
        </Stack>
        <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary' }}>
          <CloseRoundedIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 3, pt: 2, pb: 1 }}>
        <Stack spacing={2.25}>
          {error && (
            <Alert severity="error" onClose={() => setError(null)} sx={{ borderRadius: 2.5, fontSize: '0.78rem' }}>
              {error}
            </Alert>
          )}

          {/* Title */}
          <TextField
            label="What's happening? ✨"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) handleSave(); }}
            fullWidth
            autoFocus
            size="small"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2.5, background: alpha('#fff', 0.7), fontSize: '0.9rem',
                '& fieldset': { borderColor: alpha(brand[300], 0.4) },
                '&:hover fieldset': { borderColor: brand[400] },
                '&.Mui-focused fieldset': { borderColor: brand[500], borderWidth: 2 },
              },
            }}
          />

          {/* Type chips */}
          <Box>
            <Typography sx={{ fontSize: '0.7rem', fontWeight: 800, color: 'text.secondary', mb: 0.75, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Type
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={0.6}>
              {allEntryTypes.map((type) => {
                const selected = typeId === type.id;
                return (
                  <Box
                    key={type.id}
                    component="button"
                    onClick={() => setTypeId(type.id)}
                    sx={{
                      display: 'flex', alignItems: 'center', gap: 0.5,
                      px: 1.25, py: 0.55, borderRadius: 3,
                      border: '2px solid',
                      borderColor: selected ? type.color : alpha(brand[200], 0.6),
                      background: selected ? alpha(type.color, 0.12) : alpha('#fff', 0.5),
                      cursor: 'pointer', transition: 'all 0.15s ease',
                      boxShadow: selected ? `0 2px 8px ${alpha(type.color, 0.25)}` : 'none',
                      '&:hover': {
                        borderColor: type.color,
                        background: alpha(type.color, 0.1),
                        transform: 'translateY(-1px)',
                      },
                    }}
                  >
                    <Typography sx={{ fontSize: '1rem', lineHeight: 1 }}>{type.emoji}</Typography>
                    <Typography sx={{
                      fontSize: '0.75rem', fontWeight: 700, lineHeight: 1,
                      color: selected ? type.color : 'text.secondary',
                    }}>
                      {type.name}
                    </Typography>
                  </Box>
                );
              })}
            </Stack>
          </Box>

          {/* Date */}
          <DatePicker
            label="Date"
            value={startDate}
            onChange={(val) => {
              setStartDate(val);
              if (val && (!endDate || endDate.isBefore(val))) setEndDate(val);
            }}
            slotProps={{
              textField: { size: 'small', fullWidth: true, sx: datePickerSx },
              openPickerButton: { sx: { color: brand[500] } },
            }}
          />

          {/* More options toggle */}
          <Box>
            <Box
              component="button"
              onClick={() => setShowMore((p) => !p)}
              sx={{
                display: 'flex', alignItems: 'center', gap: 0.25,
                background: 'none', border: 'none', cursor: 'pointer', p: 0,
                color: brand[500], fontSize: '0.75rem', fontWeight: 700,
                '&:hover': { color: brand[700] },
              }}
            >
              {showMore ? <ExpandLessRoundedIcon sx={{ fontSize: '1rem' }} /> : <ExpandMoreRoundedIcon sx={{ fontSize: '1rem' }} />}
              {showMore ? 'Fewer options' : 'More options (end date, repeat)'}
            </Box>
            <Collapse in={showMore}>
              <Stack spacing={1.75} mt={1.5}>
                <DatePicker
                  label="End date"
                  value={endDate}
                  onChange={(val) => setEndDate(val)}
                  minDate={startDate ?? undefined}
                  slotProps={{
                    textField: { size: 'small', fullWidth: true, sx: datePickerSx },
                    openPickerButton: { sx: { color: brand[500] } },
                  }}
                />
                <FrequencyPicker value={frequencyDays} onChange={setFrequencyDays} />
              </Stack>
            </Collapse>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1.5 }}>
        <Button
          onClick={onClose}
          sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'none' }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={!title.trim()}
          variant="contained"
          sx={{
            background: `linear-gradient(135deg, ${brand[400]}, ${accent[300]})`,
            color: 'white', fontWeight: 800, textTransform: 'none',
            borderRadius: 2.5, px: 3,
            boxShadow: `0 4px 14px ${alpha(brand[400], 0.35)}`,
            '&:hover': {
              background: `linear-gradient(135deg, ${brand[500]}, ${accent[400]})`,
              boxShadow: `0 6px 18px ${alpha(brand[400], 0.45)}`,
              transform: 'translateY(-1px)',
            },
            '&:disabled': { background: alpha(brand[200], 0.35), color: alpha('#000', 0.3) },
            transition: 'all 0.2s ease',
          }}
        >
          Add ✨
        </Button>
      </DialogActions>
    </Dialog>
  );
}
