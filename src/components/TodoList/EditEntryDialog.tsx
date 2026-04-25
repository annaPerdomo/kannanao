'use client';
import { useState, useEffect, useCallback } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Collapse from '@mui/material/Collapse';
import Alert from '@mui/material/Alert';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import ExpandLessRoundedIcon from '@mui/icons-material/ExpandLessRounded';
import { useTheme, alpha } from '@mui/material/styles';
import type { CalendarEntry, EntryType } from '@/types/todo';
import { getEntryType, toISODate } from './helpers';
import { FrequencyPicker } from './FrequencyPicker';
import { StyledDialog } from '@/components/StyledDialog';

interface EditEntryDialogProps {
  open: boolean;
  onClose: () => void;
  entry: CalendarEntry | null;
  allEntryTypes: EntryType[];
  onSave: (entry: CalendarEntry) => void;
  onDelete: (id: string) => void;
}

export function EditEntryDialog({
  open, onClose, entry, allEntryTypes, onSave, onDelete,
}: EditEntryDialogProps) {
  const theme = useTheme();
  const { brand, accent } = theme.palette;

  const [title, setTitle] = useState('');
  const [typeId, setTypeId] = useState('');
  const [startDate, setStartDate] = useState<Dayjs | null>(null);
  const [endDate, setEndDate] = useState<Dayjs | null>(null);
  const [frequencyDays, setFrequencyDays] = useState<number[]>([]);
  const [showMore, setShowMore] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (entry) {
      setTitle(entry.title);
      setTypeId(entry.typeId);
      setStartDate(dayjs(entry.startDateISO));
      setEndDate(dayjs(entry.endDateISO));
      setFrequencyDays(entry.frequencyDays ?? []);
      setShowMore((entry.startDateISO !== entry.endDateISO) || (entry.frequencyDays?.length ?? 0) > 0);
      setError(null);
    }
  }, [entry]);

  const handleSave = useCallback(async () => {
    if (!entry || !title.trim()) return;
    setSaving(true); setError(null);
    try {
      const type = getEntryType(typeId, allEntryTypes);
      const startISO = startDate ? toISODate(startDate.toDate()) : entry.startDateISO;
      const endISO = endDate ? toISODate(endDate.toDate()) : startISO;
      const safeEndDate = endISO >= startISO ? endISO : startISO;
      onSave({ ...entry, title: title.trim(), typeId: type.id, emoji: type.emoji, color: type.color, startDateISO: startISO, endDateISO: safeEndDate, frequencyDays });
      onClose();
    } catch { setError('Oops! Couldn\'t save. Please try again.'); }
    finally { setSaving(false); }
  }, [entry, title, typeId, startDate, endDate, frequencyDays, allEntryTypes, onSave, onClose]);

  const handleDelete = useCallback(() => {
    if (!entry) return;
    onDelete(entry.id); onClose();
  }, [entry, onDelete, onClose]);

  if (!entry) return null;

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
    <StyledDialog
      open={open}
      onClose={onClose}
      title="Edit Special Day"
      actionsJustify="space-between"
      actions={
        <>
          <Button onClick={handleDelete} sx={{ color: 'error.main', fontWeight: 700, textTransform: 'none', fontSize: '0.875rem' }}>
            Delete
          </Button>
          <Stack direction="row" spacing={1}>
            <Button onClick={onClose} sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'none', fontSize: '0.875rem' }}>
              Cancel
            </Button>
            <Button
              onClick={handleSave} disabled={!title.trim() || saving} variant="contained"
              sx={{
                background: `linear-gradient(135deg, ${brand[400]}, ${accent[300]})`,
                color: 'white', fontWeight: 800, textTransform: 'none', fontSize: '0.875rem',
                px: 2.5, borderRadius: 2.5, boxShadow: `0 4px 12px ${alpha(brand[400], 0.3)}`,
                '&:hover': { background: `linear-gradient(135deg, ${brand[500]}, ${accent[400]})` },
                '&:disabled': { background: alpha(brand[200], 0.3), color: alpha('#000', 0.3) },
              }}
            >
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </Stack>
        </>
      }
    >
      <Stack spacing={2}>
        {error && <Alert severity="error" onClose={() => setError(null)} sx={{ borderRadius: 2.5, fontSize: '0.78rem' }}>{error}</Alert>}

        <TextField
          label="What is it?" value={title} onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void handleSave(); }}
          fullWidth autoFocus size="small"
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2.5, background: alpha('#fff', 0.6), fontSize: '0.85rem',
              '& fieldset': { borderColor: alpha(brand[300], 0.4) },
              '&:hover fieldset': { borderColor: brand[400] },
              '&.Mui-focused fieldset': { borderColor: brand[500], borderWidth: 2 },
            },
          }}
        />

        {/* Type chips */}
        <Box>
          <Typography sx={{ fontSize: '0.7rem', fontWeight: 800, color: 'text.secondary', mb: 0.75, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Kind
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={0.6}>
            {allEntryTypes.map((type) => {
              const selected = typeId === type.id;
              return (
                <Box
                  key={type.id} component="button" onClick={() => setTypeId(type.id)}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 0.5, px: 1.1, py: 0.5, borderRadius: 3,
                    border: '2px solid', borderColor: selected ? type.color : alpha(brand[200], 0.6),
                    background: selected ? alpha(type.color, 0.12) : alpha('#fff', 0.5),
                    cursor: 'pointer', transition: 'all 0.15s ease',
                    boxShadow: selected ? `0 2px 8px ${alpha(type.color, 0.25)}` : 'none',
                    '&:hover': { borderColor: type.color, background: alpha(type.color, 0.1) },
                  }}
                >
                  <Typography sx={{ fontSize: '0.9rem', lineHeight: 1 }}>{type.emoji}</Typography>
                  <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: selected ? type.color : 'text.secondary' }}>
                    {type.name}
                  </Typography>
                </Box>
              );
            })}
          </Stack>
        </Box>

        <DatePicker
          label="When? 📅" value={startDate}
          onChange={(val) => { setStartDate(val); if (val && endDate && endDate.isBefore(val)) setEndDate(val); }}
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
  );
}
