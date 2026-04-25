'use client';
import { useState, useEffect, useCallback } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Collapse from '@mui/material/Collapse';
import Alert from '@mui/material/Alert';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import ExpandLessRoundedIcon from '@mui/icons-material/ExpandLessRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import { useTheme, alpha } from '@mui/material/styles';
import type { CalendarEntry, EntryType } from '@/types/todo';
import { DEFAULT_ENTRY_TYPES, getEntryType, toISODate } from './helpers';
import { FrequencyPicker } from './FrequencyPicker';
import { ManageEntryTypesDialog } from './ManageEntryTypesDialog';
import { StyledDialog } from '@/components/StyledDialog';

interface AddEntryDialogProps {
  open: boolean;
  onClose: () => void;
  selectedDate: Date;
  allEntryTypes: EntryType[];
  onAddEntry: (entry: CalendarEntry) => void;
  onAddEntryType: (name: string, emoji: string, color: string) => Promise<EntryType>;
  onUpdateEntryType: (id: string, name: string, emoji: string) => Promise<EntryType>;
  onDeleteEntryType: (typeId: string) => Promise<void>;
}

export function AddEntryDialog({
  open, onClose, selectedDate, allEntryTypes, onAddEntry,
  onAddEntryType, onUpdateEntryType, onDeleteEntryType,
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
  const [manageTypesOpen, setManageTypesOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(''); setTypeId(DEFAULT_ENTRY_TYPES[0].id);
      setStartDate(dayjs(selectedDate)); setEndDate(dayjs(selectedDate));
      setFrequencyDays([]); setShowMore(false); setError(null);
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
        id: crypto.randomUUID(), title: title.trim(), typeId: type.id,
        emoji: type.emoji, color: type.color, startDateISO: startISO, endDateISO: safeEnd, frequencyDays,
      };
      onAddEntry(newEntry); onClose();
    } catch { setError('Oops! Couldn\'t add it. Please try again.'); }
  }, [title, typeId, startDate, endDate, frequencyDays, allEntryTypes, selectedDate, onAddEntry, onClose]);

  const datePickerSx = {
    '& .MuiPickersSectionList-root': { fontWeight: 700, fontSize: '0.85rem' },
  };

  const daySlotSx = {
    fontWeight: 700, color: brand[700],
    '&:hover:not(.Mui-selected)': { background: alpha(brand[200], 0.5), color: brand[700] },
    '&.Mui-selected': {
      background: `linear-gradient(135deg, ${brand[200]}, ${alpha(accent[200], 0.9)})`,
      color: brand[800], fontWeight: 800, boxShadow: `0 2px 8px ${alpha(brand[300], 0.35)}`,
      '&:hover': { background: `linear-gradient(135deg, ${brand[300]}, ${alpha(accent[300], 0.85)})`, color: brand[800] },
      '&:focus-visible': { background: `linear-gradient(135deg, ${brand[200]}, ${alpha(accent[200], 0.9)})`, color: brand[800] },
    },
    '&.MuiPickersDay-today:not(.Mui-selected)': { border: `2px solid ${brand[400]}`, color: brand[600] },
  };

  const calendarPopperSx = {
    borderRadius: 3, border: `1.5px solid ${alpha(brand[300], 0.3)}`,
    boxShadow: `0 8px 32px ${alpha(brand[400], 0.2)}, 0 2px 8px ${alpha(accent[200], 0.1)}`,
    background: `linear-gradient(160deg, ${alpha(brand[50], 0.98)} 0%, ${alpha(accent[50], 0.92)} 100%)`,
    overflow: 'hidden',
    '& .MuiPickersCalendarHeader-label': { fontWeight: 800, color: brand[700] },
    '& .MuiPickersCalendarHeader-switchViewButton': { color: brand[500] },
    '& .MuiPickersArrowSwitcher-button': { color: brand[500], '&:hover': { color: brand[700], background: alpha(brand[100], 0.5) } },
    '& .MuiDayCalendar-weekDayLabel': { color: brand[400], fontWeight: 700 },
    '& .MuiPickersYear-yearButton': {
      fontWeight: 700, color: brand[700],
      '&.Mui-selected': { background: `linear-gradient(135deg, ${brand[200]}, ${alpha(accent[200], 0.9)})`, color: brand[800], fontWeight: 800 },
    },
  };

  return (
    <>
      <StyledDialog
        open={open}
        onClose={onClose}
        title="📅 Add a Special Day"
        actions={
          <Stack direction="row" spacing={1}>
            <Button onClick={onClose} sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'none' }}>
              Cancel
            </Button>
            <Button
              onClick={handleSave} disabled={!title.trim()} variant="contained"
              sx={{
                background: `linear-gradient(135deg, ${brand[400]}, ${accent[300]})`,
                color: 'white', fontWeight: 800, textTransform: 'none', borderRadius: 2.5, px: 3,
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
          </Stack>
        }
      >
        <Stack spacing={2.25}>
          {error && <Alert severity="error" onClose={() => setError(null)} sx={{ borderRadius: 2.5, fontSize: '0.78rem' }}>{error}</Alert>}

          <TextField
            label="What is it? ✨" value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) handleSave(); }}
            fullWidth autoFocus size="small"
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
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={0.75}>
              <Typography sx={{ fontSize: '0.7rem', fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Kind
              </Typography>
              <Tooltip title="Manage labels">
                <IconButton
                  size="small" onClick={() => setManageTypesOpen(true)}
                  sx={{ color: brand[400], p: 0.4, '&:hover': { color: brand[600], background: alpha(brand[100], 0.5) } }}
                >
                  <TuneRoundedIcon sx={{ fontSize: '0.95rem' }} />
                </IconButton>
              </Tooltip>
            </Stack>
            <Stack direction="row" flexWrap="wrap" gap={0.6}>
              {allEntryTypes.map((type) => {
                const selected = typeId === type.id;
                return (
                  <Box
                    key={type.id} component="button" onClick={() => setTypeId(type.id)}
                    sx={{
                      display: 'flex', alignItems: 'center', gap: 0.5,
                      px: 1.25, py: 0.55, borderRadius: 3, border: '2px solid',
                      borderColor: selected ? type.color : alpha(brand[200], 0.6),
                      background: selected ? alpha(type.color, 0.12) : alpha('#fff', 0.5),
                      cursor: 'pointer', transition: 'all 0.15s ease',
                      boxShadow: selected ? `0 2px 8px ${alpha(type.color, 0.25)}` : 'none',
                      '&:hover': { borderColor: type.color, background: alpha(type.color, 0.1), transform: 'translateY(-1px)' },
                    }}
                  >
                    <Typography sx={{ fontSize: '1rem', lineHeight: 1 }}>{type.emoji}</Typography>
                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, lineHeight: 1, color: selected ? type.color : 'text.secondary' }}>
                      {type.name}
                    </Typography>
                  </Box>
                );
              })}
            </Stack>
          </Box>

          <DatePicker
            label="When? 📅" value={startDate}
            onChange={(val) => { setStartDate(val); if (val && (!endDate || endDate.isBefore(val))) setEndDate(val); }}
            slotProps={{
              textField: { size: 'small', fullWidth: true, sx: datePickerSx },
              openPickerButton: { sx: { color: brand[500] } },
              desktopPaper: { sx: calendarPopperSx },
              day: { sx: daySlotSx },
            }}
          />

          <Box>
            <Box
              component="button" onClick={() => setShowMore((p) => !p)}
              sx={{
                display: 'flex', alignItems: 'center', gap: 0.25,
                background: 'none', border: 'none', cursor: 'pointer', p: 0,
                color: brand[500], fontSize: '0.75rem', fontWeight: 700, '&:hover': { color: brand[700] },
              }}
            >
              {showMore ? <ExpandLessRoundedIcon sx={{ fontSize: '1rem' }} /> : <ExpandMoreRoundedIcon sx={{ fontSize: '1rem' }} />}
              {showMore ? 'Show less' : 'Lasts more than one day? Or repeat?'}
            </Box>
            <Collapse in={showMore}>
              <Stack spacing={1.75} mt={1.5}>
                <DatePicker
                  label="Last day 📅" value={endDate} onChange={(val) => setEndDate(val)}
                  minDate={startDate ?? undefined}
                  slotProps={{
                    textField: { size: 'small', fullWidth: true, sx: datePickerSx },
                    openPickerButton: { sx: { color: brand[500] } },
                    desktopPaper: { sx: calendarPopperSx },
                    day: { sx: daySlotSx },
                  }}
                />
                <FrequencyPicker value={frequencyDays} onChange={setFrequencyDays} repeatUntilDone={false} onRepeatUntilDoneChange={() => {}} showRepeatUntilDone={false} />
              </Stack>
            </Collapse>
          </Box>
        </Stack>
      </StyledDialog>
      <ManageEntryTypesDialog
        open={manageTypesOpen} onClose={() => setManageTypesOpen(false)}
        allEntryTypes={allEntryTypes} onAddEntryType={onAddEntryType}
        onUpdateEntryType={onUpdateEntryType} onDeleteEntryType={onDeleteEntryType}
      />
    </>
  );
}
