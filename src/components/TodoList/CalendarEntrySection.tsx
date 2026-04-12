'use client';
import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Collapse from '@mui/material/Collapse';
import { useTheme, alpha } from '@mui/material/styles';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import ExpandLessRoundedIcon from '@mui/icons-material/ExpandLessRounded';
import type { CalendarEntry, EntryType } from '@/types/todo';
import { getEntryType, isEntryOnDate, DAY_LABELS_SHORT, DAY_INDEX_TO_JS } from './helpers';
import { AddEntryDialog } from './AddEntryDialog';
import { EditEntryDialog } from './EditEntryDialog';

interface CalendarEntrySectionProps {
  entries: CalendarEntry[];
  onAddEntry: (entry: CalendarEntry) => void;
  onEditEntry: (entry: CalendarEntry) => void;
  onDeleteEntry: (id: string) => void;
  allEntryTypes: EntryType[];
  onAddEntryType: (name: string, emoji: string, color: string) => Promise<EntryType>;
  onUpdateEntryType: (id: string, name: string, emoji: string) => Promise<EntryType>;
  onDeleteEntryType: (typeId: string) => Promise<void>;
  selectedDate: Date;
}

export function CalendarEntrySection({
  entries, onAddEntry, onEditEntry, onDeleteEntry, allEntryTypes,
  onAddEntryType, onUpdateEntryType, onDeleteEntryType, selectedDate,
}: CalendarEntrySectionProps) {
  const theme = useTheme();
  const { brand, accent } = theme.palette;

  const entriesForDay = entries.filter((e) => isEntryOnDate(e, selectedDate));

  const [addOpen, setAddOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CalendarEntry | null>(null);
  const [collapsed, setCollapsed] = useState(entriesForDay.length === 0);

  useEffect(() => {
    setCollapsed(entriesForDay.length === 0);
  }, [selectedDate]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Box>
      {/* Section header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={collapsed ? 0 : 0.75}>
        <Stack direction="row" alignItems="center" spacing={0.25}>
          <IconButton
            size="small"
            onClick={() => setCollapsed((c) => !c)}
            sx={{ color: brand[400], '&:hover': { color: brand[600], background: alpha(brand[100], 0.5) } }}
          >
            {collapsed
              ? <ExpandMoreRoundedIcon sx={{ fontSize: '0.95rem' }} />
              : <ExpandLessRoundedIcon sx={{ fontSize: '0.95rem' }} />}
          </IconButton>
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 800, color: brand[600], textTransform: 'uppercase', letterSpacing: 0.5 }}>
            📌 Events
          </Typography>
        </Stack>
        <Button
          size="small"
          startIcon={<AddRoundedIcon sx={{ fontSize: '0.9rem !important' }} />}
          onClick={() => setAddOpen(true)}
          sx={{
            borderRadius: 2.5, py: 0.35, px: 1.25,
            fontSize: '0.72rem', fontWeight: 800,
            background: `linear-gradient(135deg, ${alpha(brand[400], 0.12)}, ${alpha(accent[300], 0.12)})`,
            color: brand[600],
            border: `1.5px solid ${alpha(brand[300], 0.35)}`,
            textTransform: 'none',
            '&:hover': {
              background: `linear-gradient(135deg, ${alpha(brand[400], 0.2)}, ${alpha(accent[300], 0.2)})`,
              borderColor: brand[400],
              transform: 'translateY(-1px)',
            },
            transition: 'all 0.18s ease',
          }}
        >
          Add event
        </Button>
      </Stack>

      <Collapse in={!collapsed}>
        {/* Event cards */}
        {entriesForDay.length === 0 ? (
        <Box
          component="button"
          onClick={() => setAddOpen(true)}
          sx={{
            width: '100%', py: 1.25,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.75,
            borderRadius: 3, border: `1.5px dashed ${alpha(brand[200], 0.5)}`,
            background: 'none', cursor: 'pointer',
            color: alpha(brand[400], 0.7), fontSize: '0.75rem', fontWeight: 700,
            transition: 'all 0.18s ease',
            '&:hover': { borderColor: brand[400], color: brand[500], background: alpha(brand[50], 0.5) },
          }}
        >
          <AddRoundedIcon sx={{ fontSize: '0.9rem' }} />
          No events — tap to add one
        </Box>
      ) : (
        <Stack spacing={0.5}>
          {entriesForDay.map((entry) => {
            const type = getEntryType(entry.typeId, allEntryTypes);
            const hasRange = entry.startDateISO !== entry.endDateISO;
            const hasRepeat = entry.frequencyDays && entry.frequencyDays.length > 0;
            return (
              <Box
                key={entry.id}
                sx={{
                  display: 'flex', gap: 0.75, alignItems: 'center',
                  px: 1.1, py: 0.8, borderRadius: 2.5,
                  background: alpha(type.color, 0.08),
                  border: `1.5px solid ${alpha(type.color, 0.18)}`,
                  transition: 'all 0.15s ease',
                  '&:hover': { background: alpha(type.color, 0.15), '& .entry-edit-btn': { opacity: 1 } },
                }}
              >
                <Typography sx={{ fontSize: '1.05rem', flexShrink: 0, lineHeight: 1 }}>{entry.emoji}</Typography>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: 'text.primary' }}>
                    {entry.title}
                  </Typography>
                  {(hasRange || hasRepeat) && (
                    <Typography sx={{ fontSize: '0.62rem', color: 'text.disabled' }}>
                      {hasRange && `→ ${entry.endDateISO}`}
                      {hasRepeat && ` 🔁 ${entry.frequencyDays!.map((d) => DAY_LABELS_SHORT[DAY_INDEX_TO_JS.indexOf(d)]).join('')}`}
                    </Typography>
                  )}
                </Box>
                <Tooltip title="Edit">
                  <IconButton
                    className="entry-edit-btn"
                    size="small"
                    onClick={() => setEditingEntry(entry)}
                    sx={{
                      opacity: 0, transition: 'opacity 0.15s',
                      color: brand[500], p: 0.5,
                      '&:hover': { color: brand[700], background: alpha(brand[100], 0.5) },
                    }}
                  >
                    <EditRoundedIcon sx={{ fontSize: '0.85rem' }} />
                  </IconButton>
                </Tooltip>
              </Box>
            );
          })}
          {/* Small "add another" row */}
          <Button
            size="small"
            startIcon={<AddRoundedIcon sx={{ fontSize: '0.8rem !important' }} />}
            onClick={() => setAddOpen(true)}
            sx={{
              borderRadius: 2, py: 0.3, textTransform: 'none',
              fontSize: '0.68rem', fontWeight: 700,
              color: alpha(brand[500], 0.7),
              '&:hover': { color: brand[600], background: alpha(brand[50], 0.6) },
              alignSelf: 'flex-start',
            }}
          >
            Add another
          </Button>
        </Stack>
      )}
      </Collapse>

      <AddEntryDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        selectedDate={selectedDate}
        allEntryTypes={allEntryTypes}
        onAddEntry={onAddEntry}
        onAddEntryType={onAddEntryType}
        onUpdateEntryType={onUpdateEntryType}
        onDeleteEntryType={onDeleteEntryType}
      />
      <EditEntryDialog
        open={!!editingEntry}
        onClose={() => setEditingEntry(null)}
        entry={editingEntry}
        allEntryTypes={allEntryTypes}
        onSave={onEditEntry}
        onDelete={onDeleteEntry}
      />
    </Box>
  );
}
