'use client';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import LinearProgress from '@mui/material/LinearProgress';
import Collapse from '@mui/material/Collapse';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import { alpha } from '@mui/material/styles';
import { DayProgress } from './DayProgress';
import { CalendarEntrySection } from './CalendarEntrySection';
import { AddTodoInput } from './AddTodoInput';
import { TodoItem } from './TodoItem';
import { isCompletedOnDate } from './helpers';
import type { Todo, CalendarEntry, EntryType } from '@/types/todo';

interface DayDetailPanelProps {
  view: 'week' | 'month';
  activeDateLabel: string;
  activeDateISO: string;
  isPastDate: boolean;
  todosForDay: Todo[];
  completedCount: number;
  totalCount: number;
  loading: boolean;
  error: string | null;
  clearError: () => void;
  celebration: string;
  input: string;
  onInputChange: (val: string) => void;
  onAdd: () => void;
  frequencyDays: number[];
  onFrequencyChange: (days: number[]) => void;
  onToggle: (id: string, dateISO: string) => Promise<boolean>;
  onEditEmoji: (id: string, emoji: string) => void;
  onDelete: (id: string) => void;
  onAdvancedEdit: (todo: Todo) => void;
  onXpEarned?: (xp: number) => void;
  entries: CalendarEntry[];
  onAddEntry: (entry: CalendarEntry) => void;
  onEditEntry: (entry: CalendarEntry) => void;
  onDeleteEntry: (id: string) => void;
  allEntryTypes: EntryType[];
  onAddEntryType: (name: string, emoji: string, color: string) => Promise<EntryType>;
  onUpdateEntryType: (id: string, name: string, emoji: string) => Promise<EntryType>;
  onDeleteEntryType: (typeId: string) => Promise<void>;
  selectedDate: Date;
  brandPalette: Record<number, string>;
  accentPalette: Record<number, string>;
}

export function DayDetailPanel({
  view, activeDateLabel, activeDateISO, isPastDate,
  todosForDay, completedCount, totalCount,
  loading, error, clearError, celebration,
  input, onInputChange, onAdd, frequencyDays, onFrequencyChange,
  onToggle, onEditEmoji, onDelete, onAdvancedEdit, onXpEarned,
  entries, onAddEntry, onEditEntry, onDeleteEntry,
  allEntryTypes, onAddEntryType, onUpdateEntryType, onDeleteEntryType,
  selectedDate, brandPalette: brand, accentPalette: accent,
}: DayDetailPanelProps) {
  return (
    <Stack spacing={1.5}>
      {view === 'month' && (
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography sx={{ fontWeight: 800, fontSize: '0.85rem', color: brand[700] }}>
            📅 {activeDateLabel}
          </Typography>
        </Stack>
      )}

      <CalendarEntrySection
        entries={entries}
        onAddEntry={onAddEntry}
        onEditEntry={onEditEntry}
        onDeleteEntry={onDeleteEntry}
        allEntryTypes={allEntryTypes}
        onAddEntryType={onAddEntryType}
        onUpdateEntryType={onUpdateEntryType}
        onDeleteEntryType={onDeleteEntryType}
        selectedDate={selectedDate}
      />

      <Divider sx={{ borderColor: alpha(brand[200], 0.3) }} />

      <Stack spacing={1} useFlexGap>
        <Box>
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 800, color: brand[600], textTransform: 'uppercase', letterSpacing: 0.5 }}>
            ✅ To-Dos
          </Typography>
          <DayProgress completedCount={completedCount} totalCount={totalCount} />
        </Box>

        <Box sx={{ mt: 1.5 }}>
          <AddTodoInput
            value={input} onChange={onInputChange} onAdd={onAdd} disabled={loading}
            frequencyDays={frequencyDays} onFrequencyChange={onFrequencyChange}
          />
        </Box>

        <Collapse in={!!celebration}>
          <Box sx={{
            textAlign: 'center', py: 0.75, borderRadius: 3,
            background: `linear-gradient(90deg, ${alpha(brand[300], 0.15)}, ${alpha(accent[200], 0.2)}, ${alpha(brand[300], 0.15)})`,
            animation: 'pulse-soft 1s ease infinite',
            '@keyframes pulse-soft': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.75 } },
          }}>
            <Typography sx={{ fontWeight: 800, fontSize: '0.88rem', color: brand[700] }}>
              {celebration} All done! 🎊
            </Typography>
          </Box>
        </Collapse>

        <Collapse in={!!error}>
          <Alert severity="error" onClose={clearError} sx={{ borderRadius: 2.5, fontSize: '0.78rem' }}>
            {error}
          </Alert>
        </Collapse>

        {loading ? (
          <Box sx={{ py: 2 }}>
            <LinearProgress sx={{
              borderRadius: 2, bgcolor: alpha(brand[200], 0.15),
              '& .MuiLinearProgress-bar': { background: `linear-gradient(90deg, ${brand[400]}, ${accent[300]})` },
            }} />
            <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 1, color: 'text.disabled' }}>
              Loading your list... 🌸
            </Typography>
          </Box>
        ) : todosForDay.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 2.5 }}>
            <Typography sx={{ fontSize: '1.75rem', mb: 0.5 }}>🌷</Typography>
            <Typography sx={{ color: 'text.secondary', fontSize: '0.82rem', fontWeight: 700 }}>
              {isPastDate ? 'Nothing scheduled for this day' : 'Nothing here yet!'}
            </Typography>
            {!isPastDate && (
              <Typography sx={{ color: 'text.disabled', fontSize: '0.72rem', mt: 0.25 }}>
                Type a task above and press Enter ⭐
              </Typography>
            )}
          </Box>
        ) : (
          <Stack spacing={0.75}>
            {[
              ...todosForDay.filter((t) => !isCompletedOnDate(t, activeDateISO)),
              ...todosForDay.filter((t) => isCompletedOnDate(t, activeDateISO)),
            ].map((todo) => (
              <TodoItem
                key={todo.id} todo={todo} viewDateISO={activeDateISO}
                onToggle={onToggle} onEditEmoji={onEditEmoji} onDelete={onDelete}
                onAdvancedEdit={onAdvancedEdit} onXpEarned={onXpEarned}
              />
            ))}
          </Stack>
        )}
      </Stack>
    </Stack>
  );
}
