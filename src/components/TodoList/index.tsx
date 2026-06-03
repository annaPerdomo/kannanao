'use client';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useEventTypes } from '@/hooks/useEventTypes';
import { useTodos } from '@/hooks/useTodos';
import type { CalendarEntry, EntryType } from '@/types/todo';
import type { Todo } from '@/types/todo';

import { DayDetailPanel } from './DayDetailPanel';
import { EditTodoDialog } from './EditTodoDialog';
import {
  calculateStreak,
  CALENDAR_ENTRIES_KEY,
  DEFAULT_ENTRY_TYPES,
  getWeekDates,
  isCompletedOnDate,
  isScheduledForDate,
  MONTH_NAMES,
  parseJson,
  randomCelebration,
  todayDayIndex,
  todayISO,
  toISODate,
  XP_PER_TODO,
} from './helpers';
import { MonthCalendar } from './MonthCalendar';
import { TodoHeader } from './TodoHeader';
import { WeekStrip } from './WeekStrip';

export { XP_PER_TODO };

interface TodoListProps {
  onXpEarned?: (xp: number) => void;
  /** Server-seeded data so the widget renders without client fetches. */
  initialTodos?: Todo[];
  initialEntryTypes?: EntryType[];
}

export function TodoList({ onXpEarned, initialTodos, initialEntryTypes }: TodoListProps) {
  const theme = useTheme();
  const { brand, accent } = theme.palette;

  const {
    todos,
    loading,
    error,
    addTodo,
    toggleTodo,
    editEmoji,
    editTodoAdvanced,
    deleteTodo,
    reorderTodos,
    clearError,
  } = useTodos(initialTodos);

  const [view, setView] = useState<'week' | 'month'>('week');
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDayIndex, setSelectedDayIndex] = useState(todayDayIndex);
  const [monthSelectedDateISO, setMonthSelectedDateISO] = useState(todayISO());
  const [input, setInput] = useState('');
  const [frequencyDays, setFrequencyDays] = useState<number[]>([]);
  const [repeatUntilDone, setRepeatUntilDone] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const {
    entryTypes: persistedEntryTypes,
    addEntryType,
    updateEntryType,
    deleteEntryType,
  } = useEventTypes(initialEntryTypes);
  const allEntryTypes: EntryType[] = [...DEFAULT_ENTRY_TYPES, ...persistedEntryTypes];
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
  const streak = useMemo(() => calculateStreak(todos), [todos]);

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
    addTodo(input, frequencyDays, activeDateISO, repeatUntilDone);
    setInput('');
    setRepeatUntilDone(false);
  }, [input, frequencyDays, activeDateISO, repeatUntilDone, addTodo]);

  const handleAddEntry = useCallback((entry: CalendarEntry) => {
    setEntries((prev) => [...prev, entry]);
  }, []);
  const handleEditEntry = useCallback((updated: CalendarEntry) => {
    setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
  }, []);
  const handleDeleteEntry = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);
  const handleAddEntryType = useCallback(
    async (name: string, emoji: string, color: string) => addEntryType(name, emoji, color),
    [addEntryType],
  );
  const handleUpdateEntryType = useCallback(
    async (id: string, name: string, emoji: string) => updateEntryType(id, name, emoji),
    [updateEntryType],
  );
  const handleDeleteEntryType = useCallback(
    async (typeId: string) => {
      await deleteEntryType(typeId);
      setEntries((prev) => prev.filter((e) => e.typeId !== typeId));
    },
    [deleteEntryType],
  );

  const handleSaveAdvancedEdit = useCallback(
    async (
      id: string,
      text: string,
      freq: number[],
      assignedDate: string | null,
      repeatUntilDone: boolean,
    ) => {
      await editTodoAdvanced(id, text, freq, assignedDate, repeatUntilDone);
      setEditingTodo(null);
    },
    [editTodoAdvanced],
  );

  const isPastDate = new Date(activeDateISO) < new Date(todayStr);

  const activeDateLabel = useMemo(() => {
    if (activeDateISO === todayStr) return 'Today';
    const d = activeDate;
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return `${dayNames[d.getDay()]}, ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
  }, [activeDate, activeDateISO, todayStr]);

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box
        sx={{
          width: '100%',
          maxWidth: '100%',
          mx: 'auto',
          background: `linear-gradient(160deg, ${alpha(brand[50], 0.97)} 0%, ${alpha(accent[50], 0.93)} 100%)`,
          borderRadius: { xs: 0, sm: 4 },
          border: { xs: 'none', sm: `2px solid ${alpha(brand[300], 0.45)}` },
          boxShadow: {
            xs: 'none',
            sm: `0 12px 40px ${alpha(brand[300], 0.28)}, 0 4px 16px ${alpha(accent[200], 0.18)}, inset 0 1px 0 rgba(255,255,255,0.7)`,
          },
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            background: `linear-gradient(135deg, ${alpha(brand[400], 0.18)} 0%, ${alpha(accent[300], 0.22)} 100%)`,
            px: { xs: 1.5, sm: 2.5 },
            pt: 2,
            pb: 1.25,
            borderBottom: `1.5px solid ${alpha(brand[300], 0.12)}`,
          }}
        >
          <TodoHeader
            view={view}
            onViewChange={setView}
            streak={streak}
            brandPalette={brand}
            accentPalette={accent}
          />
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

        <Box sx={{ px: { xs: 1.25, sm: 2 }, py: 1.5 }}>
          {view === 'month' ? (
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
              <Box sx={{ flex: '0 0 52%', minWidth: 0 }}>
                <MonthCalendar
                  todos={todos}
                  entries={entries}
                  entryTypes={allEntryTypes}
                  monthOffset={monthOffset}
                  onMonthChange={setMonthOffset}
                  selectedDateISO={monthSelectedDateISO}
                  onSelectDate={setMonthSelectedDateISO}
                />
              </Box>
              <Divider
                orientation="vertical"
                flexItem
                sx={{ borderColor: alpha(brand[200], 0.35) }}
              />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <DayDetailPanel
                  view={view}
                  activeDateLabel={activeDateLabel}
                  activeDateISO={activeDateISO}
                  isPastDate={isPastDate}
                  todosForDay={todosForDay}
                  completedCount={completedCount}
                  totalCount={totalCount}
                  loading={loading}
                  error={error}
                  clearError={clearError}
                  celebration={celebration}
                  input={input}
                  onInputChange={setInput}
                  onAdd={handleAdd}
                  frequencyDays={frequencyDays}
                  onFrequencyChange={setFrequencyDays}
                  repeatUntilDone={repeatUntilDone}
                  onRepeatUntilDoneChange={setRepeatUntilDone}
                  onToggle={toggleTodo}
                  onEditEmoji={editEmoji}
                  onDelete={deleteTodo}
                  onAdvancedEdit={setEditingTodo}
                  onReorder={reorderTodos}
                  onXpEarned={onXpEarned}
                  entries={entries}
                  onAddEntry={handleAddEntry}
                  onEditEntry={handleEditEntry}
                  onDeleteEntry={handleDeleteEntry}
                  allEntryTypes={allEntryTypes}
                  onAddEntryType={handleAddEntryType}
                  onUpdateEntryType={handleUpdateEntryType}
                  onDeleteEntryType={handleDeleteEntryType}
                  selectedDate={activeDate}
                  brandPalette={brand}
                  accentPalette={accent}
                />
              </Box>
            </Box>
          ) : (
            <Stack spacing={1.25}>
              <DayDetailPanel
                view={view}
                activeDateLabel={activeDateLabel}
                activeDateISO={activeDateISO}
                isPastDate={isPastDate}
                todosForDay={todosForDay}
                completedCount={completedCount}
                totalCount={totalCount}
                loading={loading}
                error={error}
                clearError={clearError}
                celebration={celebration}
                input={input}
                onInputChange={setInput}
                onAdd={handleAdd}
                frequencyDays={frequencyDays}
                onFrequencyChange={setFrequencyDays}
                repeatUntilDone={repeatUntilDone}
                onRepeatUntilDoneChange={setRepeatUntilDone}
                onToggle={toggleTodo}
                onEditEmoji={editEmoji}
                onDelete={deleteTodo}
                onAdvancedEdit={setEditingTodo}
                onReorder={reorderTodos}
                onXpEarned={onXpEarned}
                entries={entries}
                onAddEntry={handleAddEntry}
                onEditEntry={handleEditEntry}
                onDeleteEntry={handleDeleteEntry}
                allEntryTypes={allEntryTypes}
                onAddEntryType={handleAddEntryType}
                onUpdateEntryType={handleUpdateEntryType}
                onDeleteEntryType={handleDeleteEntryType}
                selectedDate={activeDate}
                brandPalette={brand}
                accentPalette={accent}
              />
            </Stack>
          )}
        </Box>

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
