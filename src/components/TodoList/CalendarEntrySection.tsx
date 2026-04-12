'use client';
import { useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import { useTheme, alpha } from '@mui/material/styles';
import type { CalendarEntry, EntryType } from '@/types/todo';
import { DEFAULT_ENTRY_TYPES, getEntryType, todayISO, DAY_LABELS_SHORT, DAY_INDEX_TO_JS, isEntryOnDate } from './helpers';
import { FrequencyPicker } from './FrequencyPicker';

interface CalendarEntrySectionProps {
  entries: CalendarEntry[];
  onAddEntry: (entry: CalendarEntry) => void;
  allEntryTypes: EntryType[];
  onAddEntryType: (name: string, emoji: string, color: string) => Promise<EntryType>;
  onDeleteEntryType: (typeId: string) => void;
  selectedDate: Date;
}

export function CalendarEntrySection({
  entries, onAddEntry, allEntryTypes,
  onAddEntryType, onDeleteEntryType, selectedDate,
}: CalendarEntrySectionProps) {
  const theme = useTheme();
  const { brand, accent } = theme.palette;
  const todayStr = todayISO();

  const [expanded, setExpanded] = useState(false);
  const [entryTitle, setEntryTitle] = useState('');
  const [entryTypeId, setEntryTypeId] = useState(DEFAULT_ENTRY_TYPES[0].id);
  const [entryStartISO, setEntryStartISO] = useState(todayStr);
  const [entryEndISO, setEntryEndISO] = useState(todayStr);
  const [entryRepeatDays, setEntryRepeatDays] = useState<number[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showEntryTypes, setShowEntryTypes] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeEmoji, setNewTypeEmoji] = useState('🎉');

  const entriesForDay = entries.filter((entry) => isEntryOnDate(entry, selectedDate));

  const handleAdd = useCallback(() => {
    if (!entryTitle.trim()) return;
    const type = getEntryType(entryTypeId, allEntryTypes);
    const newEntry: CalendarEntry = {
      id: typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`,
      title: entryTitle.trim(),
      typeId: type.id,
      emoji: type.emoji,
      color: type.color,
      startDateISO: entryStartISO,
      endDateISO: entryEndISO,
      frequencyDays: entryRepeatDays,
    };
    onAddEntry(newEntry);
    setEntryTitle('');
    setEntryStartISO(todayStr);
    setEntryEndISO(todayStr);
    setEntryRepeatDays([]);
    setShowAdvanced(false);
  }, [entryTitle, entryTypeId, entryStartISO, entryEndISO, entryRepeatDays, allEntryTypes, todayStr, onAddEntry]);

  const handleAddType = useCallback(async () => {
    const name = newTypeName.trim();
    if (!name) return;
    const color = DEFAULT_ENTRY_TYPES[Math.floor(Math.random() * DEFAULT_ENTRY_TYPES.length)].color;
    try {
      const created = await onAddEntryType(name, newTypeEmoji || '🎉', color);
      setNewTypeName('');
      setNewTypeEmoji('🎉');
      setEntryTypeId(created.id);
    } catch { /* handled in hook */ }
  }, [newTypeName, newTypeEmoji, onAddEntryType]);

  return (
    <Box>
      {/* Show entries for selected day */}
      {entriesForDay.length > 0 && (
        <Box mb={1.25} sx={{
          p: 1.25, borderRadius: 3,
          background: alpha(accent[100], 0.35),
          border: `1.5px dashed ${alpha(accent[300], 0.35)}`,
        }}>
          <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: 'text.secondary', mb: 0.5 }}>
            📅 {entriesForDay.length} event{entriesForDay.length > 1 ? 's' : ''} today
          </Typography>
          <Stack spacing={0.5}>
            {entriesForDay.map((entry) => {
              const type = getEntryType(entry.typeId, allEntryTypes);
              return (
                <Box key={entry.id} sx={{
                  display: 'flex', gap: 0.75, alignItems: 'center',
                  p: 0.75, borderRadius: 2.5,
                  background: alpha(type.color, 0.1),
                }}>
                  <Typography sx={{ fontSize: '0.9rem' }}>{entry.emoji}</Typography>
                  <Box>
                    <Typography sx={{ fontSize: '0.78rem', fontWeight: 700 }}>{entry.title}</Typography>
                    <Typography sx={{ fontSize: '0.62rem', color: 'text.disabled' }}>
                      {entry.startDateISO === entry.endDateISO ? '' : `→ ${entry.endDateISO}`}
                      {entry.frequencyDays && entry.frequencyDays.length > 0 ? ` 🔁 ${entry.frequencyDays.map((day) => DAY_LABELS_SHORT[DAY_INDEX_TO_JS.indexOf(day)]).join('')}` : ''}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </Stack>
        </Box>
      )}

      {/* Collapsible add form */}
      <Box
        component="button"
        onClick={() => setExpanded(!expanded)}
        sx={{
          width: '100%', textAlign: 'left',
          px: 1.25, py: 0.75, mb: 0.5,
          borderRadius: 2.5, border: '1.5px dashed',
          borderColor: alpha(brand[300], 0.35),
          background: alpha(brand[50], 0.5),
          color: brand[600], fontSize: '0.75rem', fontWeight: 700,
          cursor: 'pointer', transition: 'all 0.2s ease',
          '&:hover': { borderColor: brand[400], background: alpha(brand[100], 0.4) },
        }}
      >
        {expanded ? '▾ Hide calendar entry form' : '＋ Add calendar entry'}
      </Box>

      <Collapse in={expanded}>
        <Stack spacing={0.75} sx={{
          p: 1.25, borderRadius: 3,
          background: alpha(brand[50], 0.4),
          border: `1px solid ${alpha(brand[200], 0.25)}`,
        }}>
          <Stack direction="row" spacing={0.75} alignItems="flex-end">
            <TextField
              label="Title" value={entryTitle}
              onChange={(e) => setEntryTitle(e.target.value)}
              size="small" fullWidth
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5, fontSize: '0.8rem' } }}
            />
            <FormControl size="small" sx={{ minWidth: 110 }}>
              <InputLabel sx={{ fontSize: '0.8rem' }}>Type</InputLabel>
              <Select
                label="Type" value={entryTypeId}
                onChange={(e) => setEntryTypeId(String(e.target.value))}
                sx={{ borderRadius: 2.5, fontSize: '0.8rem' }}
              >
                {allEntryTypes.map((type) => (
                  <MenuItem key={type.id} value={type.id} sx={{ fontSize: '0.8rem' }}>
                    {type.emoji} {type.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          <Stack direction="row" spacing={0.75} alignItems="center">
            <TextField
              label="Date" type="date" value={entryStartISO}
              onChange={(e) => {
                setEntryStartISO(e.target.value);
                if (e.target.value > entryEndISO) setEntryEndISO(e.target.value);
              }}
              size="small"
              sx={{ width: 145, '& .MuiOutlinedInput-root': { borderRadius: 2.5, fontSize: '0.78rem' } }}
            />
            <Typography
              component="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              sx={{
                color: brand[500], fontSize: '0.7rem', fontWeight: 700,
                background: 'none', border: 'none', cursor: 'pointer',
                '&:hover': { color: brand[700] },
              }}
            >
              {showAdvanced ? 'Less ▴' : 'More ▾'}
            </Typography>
          </Stack>

          <Collapse in={showAdvanced}>
            <Stack spacing={0.75} mt={0.5}>
              <TextField
                label="End date" type="date" value={entryEndISO}
                onChange={(e) => setEntryEndISO(e.target.value)}
                size="small"
                sx={{ width: 145, '& .MuiOutlinedInput-root': { borderRadius: 2.5, fontSize: '0.78rem' } }}
              />
              <FrequencyPicker value={entryRepeatDays} onChange={setEntryRepeatDays} />
            </Stack>
          </Collapse>

          <Button
            onClick={handleAdd} disabled={!entryTitle.trim()}
            size="small"
            sx={{
              borderRadius: 2.5, py: 0.5, fontSize: '0.75rem', fontWeight: 700,
              background: `linear-gradient(135deg, ${brand[400]}, ${accent[300]})`,
              color: '#fff', alignSelf: 'flex-start',
              '&:hover': { background: `linear-gradient(135deg, ${brand[500]}, ${accent[400]})` },
              '&:disabled': { background: alpha(brand[200], 0.3), color: alpha(brand[400], 0.4) },
            }}
          >
            Add entry ✨
          </Button>

          {/* Entry types manager */}
          <Typography
            component="button"
            onClick={() => setShowEntryTypes(!showEntryTypes)}
            sx={{
              color: brand[500], fontSize: '0.68rem', fontWeight: 700,
              background: 'none', border: 'none', cursor: 'pointer',
              textAlign: 'left', p: 0, mt: 0.5,
              '&:hover': { color: brand[700] },
            }}
          >
            {showEntryTypes ? '▾ Hide types' : '⚙ Manage types'}
          </Typography>

          <Collapse in={showEntryTypes}>
            <Box sx={{ p: 1, borderRadius: 2.5, background: alpha(brand[50], 0.8), border: `1px solid ${alpha(brand[200], 0.2)}` }}>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" mb={1}>
                {allEntryTypes.map((type) => (
                  <Chip
                    key={type.id}
                    label={`${type.emoji} ${type.name}`}
                    size="small"
                    onDelete={() => onDeleteEntryType(type.id)}
                    sx={{ background: alpha(type.color, 0.15), fontWeight: 700, fontSize: '0.7rem', height: 26 }}
                  />
                ))}
              </Stack>
              <Divider sx={{ my: 0.5 }} />
              <Stack direction="row" spacing={0.5} alignItems="center" mt={0.5}>
                <TextField
                  label="Name" value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  size="small"
                  sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2.5, fontSize: '0.78rem' } }}
                />
                <TextField
                  label="Emoji" value={newTypeEmoji}
                  onChange={(e) => setNewTypeEmoji(e.target.value)}
                  size="small"
                  sx={{ width: 60, '& .MuiOutlinedInput-root': { borderRadius: 2.5, fontSize: '0.78rem' } }}
                />
                <Button
                  onClick={handleAddType} disabled={!newTypeName.trim()}
                  size="small"
                  sx={{ borderRadius: 2.5, fontSize: '0.7rem', minWidth: 'auto', px: 1, background: alpha(brand[400], 0.1), color: brand[700] }}
                >
                  Add
                </Button>
              </Stack>
            </Box>
          </Collapse>
        </Stack>
      </Collapse>
    </Box>
  );
}
