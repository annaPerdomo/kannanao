'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import LinearProgress from '@mui/material/LinearProgress';
import Collapse from '@mui/material/Collapse';
import Alert from '@mui/material/Alert';
import { useTheme, alpha } from '@mui/material/styles';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import ViewWeekRoundedIcon from '@mui/icons-material/ViewWeekRounded';
import { useTodos } from '@/hooks/useTodos';
import { useEventTypes } from '@/hooks/useEventTypes';
import type { CalendarEntry, EntryType } from '@/types/todo';
import {
  XP_PER_TODO, DEFAULT_ENTRY_TYPES, CALENDAR_ENTRIES_KEY,
  randomCelebration, toISODate, todayISO, todayDayIndex,
  getWeekDates, isScheduledForDate, isCompletedOnDate, isEntryOnDate, parseJson,
} from './helpers';
import { WeekStrip } from './WeekStrip';
import { DayProgress } from './DayProgress';
import { CalendarEntrySection } from './CalendarEntrySection';
import { AddTodoInput } from './AddTodoInput';
import { TodoItem } from './TodoItem';
import { MonthCalendar } from './MonthCalendar';

export { XP_PER_TODO };

interface TodoListProps { onXpEarned?: (xp: number) => void }

export function TodoList({ onXpEarned }: TodoListProps) {
  const theme = useTheme();
  const { brand, accent } = theme.palette;

  const { todos, loading, error, addTodo, toggleTodo, editTodo, editEmoji, deleteTodo, clearError } = useTodos();

  // View state
  const [view, setView] = useState<'week' | 'month'>('week');
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDayIndex, setSelectedDayIndex] = useState(todayDayIndex);

  // Add form
  const [input, setInput] = useState('');
  const [frequencyDays, setFrequencyDays] = useState<number[]>([]);

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
  const selectedDate = weekDates[selectedDayIndex];
  const selectedDateISO = toISODate(selectedDate);

  const todosForDay = todos.filter((t) => isScheduledForDate(t, selectedDate));
  const completedCount = todosForDay.filter((t) => isCompletedOnDate(t, selectedDateISO)).length;
  const totalCount = todosForDay.length;

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
    addTodo(input, frequencyDays, selectedDateISO);
    setInput('');
  }, [input, frequencyDays, selectedDateISO, addTodo]);

  const handleAddEntry = useCallback((entry: CalendarEntry) => {
    setEntries((prev) => [...prev, entry]);
  }, []);

  const handleAddEntryType = useCallback(async (name: string, emoji: string, color: string) => {
    return addEntryType(name, emoji, color);
  }, [addEntryType]);

  const handleDeleteEntryType = useCallback((typeId: string) => {
    void deleteEntryType(typeId);
    setEntries((prev) => prev.filter((e) => e.typeId !== typeId));
  }, [deleteEntryType]);

  return (
    <Box sx={{
      width: '100%',
      maxWidth: 480,
      mx: 'auto',
      background: `linear-gradient(160deg, ${alpha(brand[50], 0.85)} 0%, ${alpha(accent[50], 0.7)} 100%)`,
      borderRadius: 4,
      border: `2px solid ${alpha(brand[300], 0.25)}`,
      boxShadow: `0 8px 32px ${alpha(brand[300], 0.15)}, 0 2px 8px ${alpha(accent[200], 0.1)}`,
      overflow: 'hidden',
    }}>
      {/* ── Header ── */}
      <Box sx={{
        background: `linear-gradient(135deg, ${alpha(brand[400], 0.15)} 0%, ${alpha(accent[300], 0.18)} 100%)`,
        px: 2, pt: 2, pb: 1.25,
        borderBottom: `1.5px solid ${alpha(brand[300], 0.12)}`,
      }}>
        {/* Title + view toggle */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.25}>
          <Stack direction="row" alignItems="center" spacing={0.75}>
            <Typography sx={{ fontSize: '1.15rem' }}>🌸</Typography>
            <Typography variant="h6" sx={{
              fontWeight: 800, fontSize: '1.05rem',
              background: `linear-gradient(90deg, ${brand[700]} 0%, ${accent[500]} 100%)`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>
              My To-Do List
            </Typography>
            <Typography sx={{ fontSize: '0.85rem' }}>✨</Typography>
          </Stack>

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
      <Box sx={{ px: 1.75, py: 1.25 }}>
        {view === 'month' ? (
          <MonthCalendar
            todos={todos} entries={entries} entryTypes={allEntryTypes}
            monthOffset={monthOffset} onMonthChange={setMonthOffset}
          />
        ) : (
          <Stack spacing={1.25}>
            {/* Progress */}
            <DayProgress completedCount={completedCount} totalCount={totalCount} />

            {/* Calendar entries for day */}
            <CalendarEntrySection
              entries={entries}
              onAddEntry={handleAddEntry}
              allEntryTypes={allEntryTypes}
              onAddEntryType={handleAddEntryType}
              onDeleteEntryType={handleDeleteEntryType}
              selectedDate={selectedDate}
            />

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
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <Typography sx={{ fontSize: '2rem', mb: 0.5 }}>🌷</Typography>
                <Typography sx={{ color: 'text.secondary', fontSize: '0.82rem', fontWeight: 700 }}>
                  Nothing here yet!
                </Typography>
                <Typography sx={{ color: 'text.disabled', fontSize: '0.72rem', mt: 0.25 }}>
                  Add a task above ⭐
                </Typography>
              </Box>
            ) : (
              <Stack spacing={0.75}>
                {[
                  ...todosForDay.filter((t) => !isCompletedOnDate(t, selectedDateISO)),
                  ...todosForDay.filter((t) => isCompletedOnDate(t, selectedDateISO)),
                ].map((todo) => (
                  <TodoItem
                    key={todo.id}
                    todo={todo}
                    viewDateISO={selectedDateISO}
                    onToggle={toggleTodo}
                    onEdit={editTodo}
                    onEditEmoji={editEmoji}
                    onDelete={deleteTodo}
                    onXpEarned={onXpEarned}
                  />
                ))}
              </Stack>
            )}
          </Stack>
        )}
      </Box>
    </Box>
  );
}
