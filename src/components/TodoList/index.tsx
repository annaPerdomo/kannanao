'use client';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import LinearProgress from '@mui/material/LinearProgress';
import Collapse from '@mui/material/Collapse';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import { useTheme, alpha } from '@mui/material/styles';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import ViewWeekRoundedIcon from '@mui/icons-material/ViewWeekRounded';
import LocalFireDepartmentRoundedIcon from '@mui/icons-material/LocalFireDepartmentRounded';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { useTodos } from '@/hooks/useTodos';
import { useEventTypes } from '@/hooks/useEventTypes';
import type { CalendarEntry, EntryType } from '@/types/todo';
import {
  XP_PER_TODO, DEFAULT_ENTRY_TYPES, CALENDAR_ENTRIES_KEY, MONTH_NAMES,
  randomCelebration, toISODate, todayISO, todayDayIndex,
  getWeekDates, isScheduledForDate, isCompletedOnDate, isEntryOnDate, parseJson,
  calculateStreak, getWeekStats,
} from './helpers';
import { WeekStrip } from './WeekStrip';
import { DayProgress } from './DayProgress';
import { CalendarEntrySection } from './CalendarEntrySection';
import { AddTodoInput } from './AddTodoInput';
import { TodoItem } from './TodoItem';
import { MonthCalendar } from './MonthCalendar';
import { EditTodoDialog } from './EditTodoDialog';
import type { Todo } from '@/types/todo';

export { XP_PER_TODO };

interface TodoListProps { onXpEarned?: (xp: number) => void }

export function TodoList({ onXpEarned }: TodoListProps) {
  const theme = useTheme();
  const { brand, accent } = theme.palette;

  const { todos, loading, error, addTodo, toggleTodo, editEmoji, editTodoAdvanced, deleteTodo, clearError } = useTodos();

  // View state
  const [view, setView] = useState<'week' | 'month'>('week');
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDayIndex, setSelectedDayIndex] = useState(todayDayIndex);
  const [monthSelectedDateISO, setMonthSelectedDateISO] = useState(todayISO());

  // Add form
  const [input, setInput] = useState('');
  const [frequencyDays, setFrequencyDays] = useState<number[]>([]);

  // Advanced edit dialog
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);

  // Calendar entries
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const { entryTypes: persistedEntryTypes, addEntryType, deleteEntryType } = useEventTypes();
  const allEntryTypes: EntryType[] = [...DEFAULT_ENTRY_TYPES, ...persistedEntryTypes];

  // Celebration
  const [celebration, setCelebration] = useState('');
  const prevCompleted = useRef(0);

  useEffect(() => {
    const stored = parseJson<CalendarEntry[]>(localStorage.getItem(CALENDAR_ENTRIES_KEY), []);
    if (stored.length > 0) setEntries(stored);
  }, []);

  useEffect(() => {
    localStorage.setItem(CALENDAR_ENTRIES_KEY, JSON.stringify(entries));
  }, [entries]);

  const todayStr = todayISO();
  const weekDates = getWeekDates(weekOffset);

  // Compute the active date based on the current view
  const activeDate = useMemo(() => {
    if (view === 'month') {
      const parts = monthSelectedDateISO.split('-').map(Number);
      return new Date(parts[0], parts[1] - 1, parts[2]);
    }
    return weekDates[selectedDayIndex];
  }, [view, monthSelectedDateISO, weekDates, selectedDayIndex]);

  const activeDateISO = toISODate(activeDate);

  const todosForDay = todos.filter((t) => isScheduledForDate(t, activeDate));
  const completedCount = todosForDay.filter((t) => isCompletedOnDate(t, activeDateISO)).length;
  const totalCount = todosForDay.length;

  // Streak
  const streak = useMemo(() => calculateStreak(todos), [todos]);

  // Week stats
  const weekStats = useMemo(() => getWeekStats(todos, weekDates), [todos, weekDates]);

  useEffect(() => {
    if (totalCount > 0 && completedCount === totalCount && completedCount > prevCompleted.current) {
      setCelebration(randomCelebration());
      const timer = setTimeout(() => setCelebration(''), 3500);
      return () => clearTimeout(timer);
    }
    prevCompleted.current = completedCount;
  }, [completedCount, totalCount]);

  const handleAdd = useCallback(() => {
    if (!input.trim()) return;
    addTodo(input, frequencyDays, activeDateISO);
    setInput('');
  }, [input, frequencyDays, activeDateISO, addTodo]);

  const handleAddEntry = useCallback((entry: CalendarEntry) => {
    setEntries((prev) => [...prev, entry]);
  }, []);

  const handleEditEntry = useCallback((updated: CalendarEntry) => {
    setEntries((prev) => prev.map((e) => e.id === updated.id ? updated : e));
  }, []);

  const handleDeleteEntry = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const handleAddEntryType = useCallback(async (name: string, emoji: string, color: string) => {
    return addEntryType(name, emoji, color);
  }, [addEntryType]);

  const handleDeleteEntryType = useCallback((typeId: string) => {
    void deleteEntryType(typeId);
    setEntries((prev) => prev.filter((e) => e.typeId !== typeId));
  }, [deleteEntryType]);

  const handleAdvancedEdit = useCallback((todo: Todo) => {
    setEditingTodo(todo);
  }, []);

  const handleSaveAdvancedEdit = useCallback(async (
    id: string,
    text: string,
    frequencyDays: number[],
    assignedDate: string | null
  ) => {
    await editTodoAdvanced(id, text, frequencyDays, assignedDate);
    setEditingTodo(null);
  }, [editTodoAdvanced]);

  // Determine if selected date is in the past
  const isPastDate = new Date(activeDateISO) < new Date(todayStr);

  // Format selected date for the day detail header
  const activeDateLabel = useMemo(() => {
    if (activeDateISO === todayStr) return 'Today';
    const d = activeDate;
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return `${dayNames[d.getDay()]}, ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
  }, [activeDate, activeDateISO, todayStr]);

  // Shared day detail panel — used by both week & month views
  const dayDetailPanel = (
    <Stack spacing={1.5}>
      {/* Day label (shown in month view to indicate which day is selected) */}
      {view === 'month' && (
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography sx={{ fontWeight: 800, fontSize: '0.85rem', color: brand[700] }}>
            📅 {activeDateLabel}
          </Typography>
          {totalCount > 0 && (
            <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: 'text.disabled' }}>
              {completedCount}/{totalCount} done
            </Typography>
          )}
        </Stack>
      )}

      {/* Progress */}
      <DayProgress completedCount={completedCount} totalCount={totalCount} />

      {/* Calendar entries section */}
      <CalendarEntrySection
        entries={entries}
        onAddEntry={handleAddEntry}
        onEditEntry={handleEditEntry}
        onDeleteEntry={handleDeleteEntry}
        allEntryTypes={allEntryTypes}
        onAddEntryType={handleAddEntryType}
        onDeleteEntryType={handleDeleteEntryType}
        selectedDate={activeDate}
      />

      <Divider sx={{ borderColor: alpha(brand[200], 0.3) }} />

      {/* Tasks section */}
      <Stack spacing={1}>
        {/* Add todo input */}
        <AddTodoInput
          value={input}
          onChange={setInput}
          onAdd={handleAdd}
          disabled={loading}
          frequencyDays={frequencyDays}
          onFrequencyChange={setFrequencyDays}
        />

        {/* Celebration */}
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

        {/* Error */}
        <Collapse in={!!error}>
          <Alert severity="error" onClose={clearError} sx={{ borderRadius: 2.5, fontSize: '0.78rem' }}>{error}</Alert>
        </Collapse>

        {/* Todo list */}
        {loading ? (
          <Box sx={{ py: 2 }}>
            <LinearProgress sx={{
              borderRadius: 2,
              bgcolor: alpha(brand[200], 0.15),
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
                key={todo.id}
                todo={todo}
                viewDateISO={activeDateISO}
                onToggle={toggleTodo}
                onEditEmoji={editEmoji}
                onDelete={deleteTodo}
                onAdvancedEdit={handleAdvancedEdit}
                onXpEarned={onXpEarned}
              />
            ))}
          </Stack>
        )}
      </Stack>
    </Stack>
  );

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
    <Box sx={{
      width: '100%',
      maxWidth: '100%',
      mx: 'auto',
      background: `linear-gradient(160deg, ${alpha(brand[50], 0.85)} 0%, ${alpha(accent[50], 0.7)} 100%)`,
      borderRadius: { xs: 0, sm: 4 },
      border: { xs: 'none', sm: `2px solid ${alpha(brand[300], 0.25)}` },
      boxShadow: { xs: 'none', sm: `0 8px 32px ${alpha(brand[300], 0.15)}, 0 2px 8px ${alpha(accent[200], 0.1)}` },
      overflow: 'hidden',
    }}>
      {/* ── Header ── */}
      <Box sx={{
        background: `linear-gradient(135deg, ${alpha(brand[400], 0.15)} 0%, ${alpha(accent[300], 0.18)} 100%)`,
        px: { xs: 1.5, sm: 2.5 }, pt: 2, pb: 1.25,
        borderBottom: `1.5px solid ${alpha(brand[300], 0.12)}`,
      }}>
        {/* Title + streak + view toggle */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.25}>
          <Stack direction="row" alignItems="center" spacing={0.75}>
            <Typography sx={{ fontSize: '1.15rem' }}>🌸</Typography>
            <Typography variant="h6" sx={{
              fontWeight: 800, fontSize: { xs: '0.95rem', sm: '1.05rem' },
              background: `linear-gradient(90deg, ${brand[700]} 0%, ${accent[500]} 100%)`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>
              My To-Do List
            </Typography>
            <Typography sx={{ fontSize: '0.85rem' }}>✨</Typography>
          </Stack>

          <Stack direction="row" alignItems="center" spacing={0.75}>
            {/* Streak chip */}
            {streak > 0 && (
              <Chip
                icon={<LocalFireDepartmentRoundedIcon sx={{ fontSize: '0.85rem !important' }} />}
                label={`${streak}`}
                size="small"
                sx={{
                  height: 24,
                  fontWeight: 800,
                  fontSize: '0.72rem',
                  bgcolor: 'rgba(251,191,36,0.18)',
                  color: '#B45309',
                  border: '1.5px solid rgba(251,191,36,0.4)',
                  '& .MuiChip-icon': { color: '#F59E0B' },
                }}
              />
            )}

            {/* View toggle pills */}
            <Stack direction="row" spacing={0.25} sx={{
              background: alpha(brand[100], 0.5),
              borderRadius: 2.5,
              p: 0.25,
              border: `1.5px solid ${alpha(brand[200], 0.35)}`,
            }}>
              {(['week', 'month'] as const).map((v) => (
                <Box
                  key={v}
                  component="button"
                  onClick={() => setView(v)}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 0.35,
                    px: 1, py: 0.4, borderRadius: 2, border: 'none',
                    background: view === v ? `linear-gradient(135deg, ${brand[400]}, ${accent[300]})` : 'transparent',
                    color: view === v ? 'white' : brand[500],
                    fontSize: '0.68rem', fontWeight: 800, cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {v === 'week'
                    ? <ViewWeekRoundedIcon sx={{ fontSize: '0.82rem' }} />
                    : <CalendarMonthRoundedIcon sx={{ fontSize: '0.82rem' }} />}
                  <span style={{ textTransform: 'capitalize' }}>{v}</span>
                </Box>
              ))}
            </Stack>
          </Stack>
        </Stack>

        {/* Week strip (only in week view) */}
        {view === 'week' && (
          <WeekStrip
            weekDates={weekDates}
            selectedDayIndex={selectedDayIndex}
            onSelectDay={setSelectedDayIndex}
            weekOffset={weekOffset}
            onWeekChange={setWeekOffset}
            todos={todos}
            entries={entries}
          />
        )}
      </Box>

      {/* ── Body ── */}
      <Box sx={{ px: { xs: 1.25, sm: 2 }, py: 1.5 }}>
        {view === 'month' ? (
          <Stack spacing={1.5}>
            <MonthCalendar
              todos={todos} entries={entries} entryTypes={allEntryTypes}
              monthOffset={monthOffset} onMonthChange={setMonthOffset}
              selectedDateISO={monthSelectedDateISO} onSelectDate={setMonthSelectedDateISO}
            />
            <Divider sx={{ borderColor: alpha(brand[200], 0.35) }} />
            {dayDetailPanel}
          </Stack>
        ) : (
          <Stack spacing={1.25}>
            {dayDetailPanel}

            {/* Week summary */}
            {weekStats.totalScheduled > 0 && (
              <Box sx={{
                mt: 0.5, p: 1.25, borderRadius: 3,
                background: alpha(brand[50], 0.6),
                border: `1.5px solid ${alpha(brand[200], 0.25)}`,
              }}>
                <Typography sx={{ fontSize: '0.72rem', fontWeight: 800, color: brand[600], mb: 0.5 }}>
                  📊 This Week
                </Typography>
                <Stack direction="row" spacing={2}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography sx={{ fontSize: '1.1rem', fontWeight: 900, color: brand[700] }}>
                      {weekStats.totalCompleted}
                    </Typography>
                    <Typography sx={{ fontSize: '0.62rem', color: 'text.disabled', fontWeight: 700 }}>
                      completed
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography sx={{ fontSize: '1.1rem', fontWeight: 900, color: accent[500] }}>
                      {weekStats.totalScheduled - weekStats.totalCompleted}
                    </Typography>
                    <Typography sx={{ fontSize: '0.62rem', color: 'text.disabled', fontWeight: 700 }}>
                      remaining
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography sx={{ fontSize: '1.1rem', fontWeight: 900, color: brand[700] }}>
                      {weekStats.perfectDays > 0 ? '⭐'.repeat(Math.min(weekStats.perfectDays, 7)) : '—'}
                    </Typography>
                    <Typography sx={{ fontSize: '0.62rem', color: 'text.disabled', fontWeight: 700 }}>
                      perfect days
                    </Typography>
                  </Box>
                </Stack>
              </Box>
            )}
          </Stack>
        )}
      </Box>

      {/* Advanced Edit Dialog */}
      <EditTodoDialog
        open={!!editingTodo}
        onClose={() => setEditingTodo(null)}
        todo={editingTodo}
        onSave={handleSaveAdvancedEdit}
      />
    </Box>
    </LocalizationProvider>
  );
}
