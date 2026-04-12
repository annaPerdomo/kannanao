'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Checkbox from '@mui/material/Checkbox';
import LinearProgress from '@mui/material/LinearProgress';
import Collapse from '@mui/material/Collapse';
import Alert from '@mui/material/Alert';
import Tooltip from '@mui/material/Tooltip';
import Popover from '@mui/material/Popover';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import ViewWeekRoundedIcon from '@mui/icons-material/ViewWeekRounded';
import EmojiPicker, { type EmojiClickData, Theme } from 'emoji-picker-react';
import { useTodos } from '@/hooks/useTodos';
import type { Todo } from '@/types/todo';

export const XP_PER_TODO = 5;

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_LABELS_SHORT = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
// weekday index in DAY_LABELS → JS getDay() value
const DAY_INDEX_TO_JS = [1, 2, 3, 4, 5, 6, 0]; // Mon=1, Tue=2, ..., Sun=0
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const CELEBRATION_MESSAGES = [
  '🎉 Amazing work!', "⭐ You're on fire!", '🌸 So productive!', '✨ Keep it up!',
  '🦋 Unstoppable!', '🌈 You did it!', '💕 Wonderful!', '🎀 Fabulous!',
];

function randomCelebration() {
  return CELEBRATION_MESSAGES[Math.floor(Math.random() * CELEBRATION_MESSAGES.length)];
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayISO(): string {
  return toISODate(new Date());
}

// Returns Mon–Sun dates for a given week offset (0 = current week)
function getWeekDates(weekOffset: number): Date[] {
  const today = new Date();
  const dow = today.getDay();
  const diffToMon = dow === 0 ? -6 : 1 - dow;
  const mon = new Date(today);
  mon.setDate(today.getDate() + diffToMon + weekOffset * 7);
  mon.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return d;
  });
}

// Sparse calendar grid for a month — null = blank padding cell
function getMonthCalendarDates(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = firstDay.getDay(); // 0=Sun
  const result: (Date | null)[] = [];
  for (let i = 0; i < startDow; i++) result.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) result.push(new Date(year, month, d));
  while (result.length % 7 !== 0) result.push(null);
  return result;
}

function isScheduledForDate(todo: Todo, date: Date): boolean {
  if (todo.frequencyDays.length === 0) return true;
  return todo.frequencyDays.includes(date.getDay());
}

function isCompletedOnDate(todo: Todo, dateISO: string): boolean {
  return todo.completedDates.includes(dateISO);
}

// ─── XpPop ────────────────────────────────────────────────────────────────────

function XpPop({ show }: { show: boolean }) {
  const theme = useTheme();
  const { brand, accent } = theme.palette;
  if (!show) return null;
  return (
    <Box sx={{
      position: 'absolute', top: '-4px', right: 8, pointerEvents: 'none', zIndex: 10,
      fontSize: '0.78rem', fontWeight: 800, color: 'secondary.dark',
      background: `linear-gradient(90deg, ${brand[100]}, ${accent[100]})`,
      border: `1.5px solid ${alpha(accent[300], 0.5)}`,
      borderRadius: 2, px: 0.75, py: 0.25, whiteSpace: 'nowrap',
      animation: 'xp-fly 0.9s ease forwards',
      '@keyframes xp-fly': {
        '0%': { opacity: 1, transform: 'translateY(0) scale(1)' },
        '60%': { opacity: 1, transform: 'translateY(-20px) scale(1.1)' },
        '100%': { opacity: 0, transform: 'translateY(-32px) scale(0.9)' },
      },
    }}>
      +{XP_PER_TODO} XP ✨
    </Box>
  );
}

// ─── FrequencyPicker ──────────────────────────────────────────────────────────

interface FrequencyPickerProps {
  value: number[]; // selected JS day indices; empty = every day
  onChange: (days: number[]) => void;
}

function FrequencyPicker({ value, onChange }: FrequencyPickerProps) {
  const theme = useTheme();
  const { brand, accent } = theme.palette;
  // Treat empty as all-selected
  const allSelected = value.length === 0;

  function toggleDay(jsDay: number) {
    let next: number[];
    if (allSelected) {
      // deselect one day = select all except that day
      next = [0, 1, 2, 3, 4, 5, 6].filter((d) => d !== jsDay);
    } else if (value.includes(jsDay)) {
      next = value.filter((d) => d !== jsDay);
      if (next.length === 0) next = []; // all removed = back to every day
    } else {
      next = [...value, jsDay];
      if (next.length === 7) next = []; // all selected = every day
    }
    onChange(next);
  }

  const isActive = (jsDay: number) => allSelected || value.includes(jsDay);

  return (
    <Stack direction="row" spacing={0.5} alignItems="center">
      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mr: 0.5 }}>
        Repeat:
      </Typography>
      {DAY_LABELS_SHORT.map((label, i) => {
        const jsDay = DAY_INDEX_TO_JS[i];
        const active = isActive(jsDay);
        return (
          <Box
            key={i}
            component="button"
            onClick={() => toggleDay(jsDay)}
            sx={{
              width: 26, height: 26, borderRadius: '50%', border: '1.5px solid',
              borderColor: active ? alpha(brand[400], 0.6) : alpha(brand[200], 0.4),
              background: active
                ? `linear-gradient(135deg, ${brand[300]}, ${accent[200]})`
                : alpha(brand[50], 0.6),
              color: active ? brand[800] : 'text.disabled',
              fontSize: '0.68rem', fontWeight: 800, cursor: 'pointer',
              transition: 'all 0.15s ease',
              '&:hover': { transform: 'scale(1.15)', borderColor: brand[400] },
            }}
          >
            {label}
          </Box>
        );
      })}
    </Stack>
  );
}

// ─── TodoItem ─────────────────────────────────────────────────────────────────

interface TodoItemProps {
  todo: Todo;
  viewDateISO: string;
  onToggle: (id: string, date: string) => Promise<boolean>;
  onEdit: (id: string, text: string) => void;
  onEditEmoji: (id: string, emoji: string) => void;
  onDelete: (id: string) => void;
  onXpEarned?: (xp: number) => void;
}

function TodoItem({ todo, viewDateISO, onToggle, onEdit, onEditEmoji, onDelete, onXpEarned }: TodoItemProps) {
  const theme = useTheme();
  const { brand, accent } = theme.palette;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(todo.text);
  const [showXp, setShowXp] = useState(false);
  const [emojiAnchor, setEmojiAnchor] = useState<HTMLElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const completed = isCompletedOnDate(todo, viewDateISO);

  const handleToggle = async () => {
    const justCompleted = await onToggle(todo.id, viewDateISO);
    if (justCompleted && viewDateISO === todayISO()) {
      setShowXp(true);
      onXpEarned?.(XP_PER_TODO);
      setTimeout(() => setShowXp(false), 950);
    }
  };

  const handleSave = () => {
    if (draft.trim()) onEdit(todo.id, draft); else setDraft(todo.text);
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') { setDraft(todo.text); setEditing(false); }
  };

  return (
    <Box sx={{
      position: 'relative', display: 'flex', alignItems: 'center', gap: 1,
      px: 1.5, py: 1, borderRadius: 3,
      background: completed
        ? alpha(brand[300], 0.06)
        : `linear-gradient(120deg, ${brand[50]} 0%, ${accent[50]} 100%)`,
      border: '1.5px solid',
      borderColor: completed ? alpha(accent[300], 0.3) : alpha(brand[400], 0.25),
      transition: 'all 0.25s ease', opacity: completed ? 0.6 : 1,
      animation: 'slide-in 0.3s ease',
      '@keyframes slide-in': { from: { opacity: 0, transform: 'translateY(-6px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
      '&:hover': {
        borderColor: completed ? alpha(accent[300], 0.5) : alpha(brand[400], 0.5),
        boxShadow: `0 2px 12px ${alpha(brand[400], 0.12)}`,
        '& .todo-actions': { opacity: 1 },
      },
    }}>
      <XpPop show={showXp} />
      <Tooltip title="Change emoji">
        <Box
          component="button"
          onClick={(e) => setEmojiAnchor(e.currentTarget)}
          sx={{
            fontSize: '1.05rem', lineHeight: 1, flexShrink: 0,
            background: 'none', border: 'none', cursor: 'pointer', p: 0.25,
            borderRadius: 1, transition: 'transform 0.15s',
            '&:hover': { transform: 'scale(1.3)' },
          }}
        >
          {todo.emoji}
        </Box>
      </Tooltip>
      <Popover
        open={Boolean(emojiAnchor)}
        anchorEl={emojiAnchor}
        onClose={() => setEmojiAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        <Box sx={{
          '--epr-bg-color': brand[50],
          '--epr-category-label-bg-color': brand[100],
          '--epr-hover-bg-color': alpha(brand[300], 0.25),
          '--epr-focus-bg-color': alpha(brand[300], 0.35),
          '--epr-highlight-color': brand[400],
          '--epr-search-border-color': alpha(brand[400], 0.4),
          '--epr-header-overlay-color': brand[50],
          '--epr-text-color': 'text.primary',
          '--epr-category-icon-active-color': accent[500],
          '--epr-search-input-bg-color': '#fff',
          '--epr-emoji-size': '24px',
          borderRadius: 3, overflow: 'hidden',
        }}>
          <EmojiPicker
            theme={Theme.LIGHT}
            onEmojiClick={(data: EmojiClickData) => {
              onEditEmoji(todo.id, data.emoji);
              setEmojiAnchor(null);
            }}
            lazyLoadEmojis
          />
        </Box>
      </Popover>
      <Checkbox checked={completed} onChange={handleToggle} size="small" sx={{
        p: 0.5, color: 'primary.main',
        '&.Mui-checked': { color: 'secondary.dark' },
        '& .MuiSvgIcon-root': { fontSize: '1.15rem' },
      }} />
      {editing ? (
        <TextField
          inputRef={inputRef} value={draft} onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown} onBlur={handleSave}
          variant="standard" size="small" fullWidth
          sx={{
            '& .MuiInput-root': { fontSize: '0.875rem', fontWeight: 600 },
            '& .MuiInput-underline:before': { borderColor: 'primary.light' },
            '& .MuiInput-underline:after': { borderColor: 'primary.main' },
          }}
        />
      ) : (
        <Typography sx={{ flex: 1, fontSize: '0.875rem', fontWeight: 600, color: 'text.primary', textDecoration: completed ? 'line-through' : 'none', transition: 'text-decoration 0.2s ease', wordBreak: 'break-word' }}>
          {todo.text}
        </Typography>
      )}
      <Stack className="todo-actions" direction="row" spacing={0} sx={{ flexShrink: 0, opacity: 0, transition: 'opacity 0.2s' }}>
        {editing ? (
          <>
            <Tooltip title="Save"><IconButton size="small" onClick={handleSave} sx={{ color: 'success.main' }}><CheckRoundedIcon sx={{ fontSize: '1rem' }} /></IconButton></Tooltip>
            <Tooltip title="Cancel"><IconButton size="small" onClick={() => { setDraft(todo.text); setEditing(false); }} sx={{ color: 'text.secondary' }}><CloseRoundedIcon sx={{ fontSize: '1rem' }} /></IconButton></Tooltip>
          </>
        ) : (
          <>
            <Tooltip title="Edit"><IconButton size="small" onClick={() => setEditing(true)} sx={{ color: 'secondary.dark' }}><EditRoundedIcon sx={{ fontSize: '1rem' }} /></IconButton></Tooltip>
            <Tooltip title="Delete"><IconButton size="small" onClick={() => onDelete(todo.id)} sx={{ color: 'error.main' }}><DeleteRoundedIcon sx={{ fontSize: '1rem' }} /></IconButton></Tooltip>
          </>
        )}
      </Stack>
    </Box>
  );
}

// ─── MonthCalendar ────────────────────────────────────────────────────────────

interface MonthCalendarProps {
  todos: Todo[];
  monthOffset: number;
  onMonthChange: (offset: number) => void;
}

function MonthCalendar({ todos, monthOffset, onMonthChange }: MonthCalendarProps) {
  const theme = useTheme();
  const { brand, accent } = theme.palette;

  const now = new Date();
  const year = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1).getFullYear();
  const month = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1).getMonth();
  const calDates = getMonthCalendarDates(year, month);
  const todayStr = todayISO();

  function getDayStats(date: Date) {
    const dateISO = toISODate(date);
    const scheduled = todos.filter((t) => isScheduledForDate(t, date));
    const completed = scheduled.filter((t) => isCompletedOnDate(t, dateISO));
    return { scheduled: scheduled.length, completed: completed.length };
  }

  function cellBg(date: Date) {
    const dateISO = toISODate(date);
    const isFuture = dateISO > todayStr;
    if (isFuture) return 'transparent';
    const { scheduled, completed } = getDayStats(date);
    if (scheduled === 0) return 'transparent';
    if (completed === scheduled) return alpha(brand[300], 0.22);
    if (completed > 0) return alpha(accent[200], 0.25);
    return 'transparent';
  }

  return (
    <Box>
      {/* Month navigation */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
        <IconButton size="small" onClick={() => onMonthChange(monthOffset - 1)} sx={{ color: 'text.secondary' }}>
          <ChevronLeftRoundedIcon />
        </IconButton>
        <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', color: 'text.primary' }}>
          {MONTH_NAMES[month]} {year}
        </Typography>
        <IconButton size="small" onClick={() => onMonthChange(monthOffset + 1)} sx={{ color: 'text.secondary' }}>
          <ChevronRightRoundedIcon />
        </IconButton>
      </Stack>

      {/* Day-of-week headers */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5, mb: 0.5 }}>
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <Typography key={d} sx={{ textAlign: 'center', fontSize: '0.7rem', fontWeight: 800, color: 'text.disabled' }}>
            {d}
          </Typography>
        ))}
      </Box>

      {/* Calendar grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5 }}>
        {calDates.map((date, i) => {
          if (!date) return <Box key={i} />;
          const dateISO = toISODate(date);
          const isToday = dateISO === todayStr;
          const isFuture = dateISO > todayStr;
          const { scheduled, completed } = getDayStats(date);
          const allDone = scheduled > 0 && completed === scheduled;
          const someDone = completed > 0 && completed < scheduled;

          return (
            <Box key={i} sx={{
              aspectRatio: '1', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', borderRadius: 2,
              background: cellBg(date),
              border: '1.5px solid',
              borderColor: isToday ? brand[400] : 'transparent',
              opacity: isFuture ? 0.45 : 1,
              position: 'relative',
            }}>
              <Typography sx={{
                fontSize: '0.75rem', fontWeight: isToday ? 900 : 600,
                color: isToday ? brand[700] : 'text.secondary',
                lineHeight: 1.2,
              }}>
                {date.getDate()}
              </Typography>
              {allDone && (
                <Typography sx={{ fontSize: '0.6rem', lineHeight: 1 }}>⭐</Typography>
              )}
              {someDone && !allDone && (
                <Typography sx={{ fontSize: '0.55rem', color: accent[600], fontWeight: 700, lineHeight: 1 }}>
                  {completed}/{scheduled}
                </Typography>
              )}
              {!allDone && !someDone && scheduled > 0 && !isFuture && (
                <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: alpha(brand[300], 0.5), mt: 0.25 }} />
              )}
            </Box>
          );
        })}
      </Box>

      {/* Legend */}
      <Stack direction="row" spacing={2} justifyContent="center" mt={1.5}>
        {[
          { label: 'All done', color: alpha(brand[300], 0.35) },
          { label: 'Some done', color: alpha(accent[200], 0.5) },
        ].map(({ label, color }) => (
          <Stack key={label} direction="row" spacing={0.5} alignItems="center">
            <Box sx={{ width: 10, height: 10, borderRadius: 1, bgcolor: color }} />
            <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.68rem' }}>{label}</Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}

// ─── TodoList ─────────────────────────────────────────────────────────────────

interface TodoListProps { onXpEarned?: (xp: number) => void; }

export function TodoList({ onXpEarned }: TodoListProps) {
  const theme = useTheme();
  const { brand, accent } = theme.palette;

  const { todos, loading, error, addTodo, toggleTodo, editTodo, editEmoji, deleteTodo, clearError } = useTodos();

  // View state
  const [view, setView] = useState<'week' | 'month'>('week');
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);

  // Default selected day = today's index in Mon-Sun week
  function todayDayIndex(): number {
    const dow = new Date().getDay(); // 0=Sun
    return dow === 0 ? 6 : dow - 1; // Mon=0, Sun=6
  }
  const [selectedDayIndex, setSelectedDayIndex] = useState(todayDayIndex);

  // Add form state
  const [input, setInput] = useState('');
  const [frequencyDays, setFrequencyDays] = useState<number[]>([]);

  // Celebration state
  const [celebration, setCelebration] = useState('');
  const prevCompleted = useRef(0);

  const weekDates = getWeekDates(weekOffset);
  const selectedDate = weekDates[selectedDayIndex];
  const selectedDateISO = toISODate(selectedDate);
  const todayStr = todayISO();

  const todosForDay = todos.filter((t) => isScheduledForDate(t, selectedDate));
  const completedCount = todosForDay.filter((t) => isCompletedOnDate(t, selectedDateISO)).length;
  const totalCount = todosForDay.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

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
    addTodo(input, frequencyDays);
    setInput('');
  }, [input, frequencyDays, addTodo]);

  function formatWeekRange() {
    const mon = weekDates[0];
    const sun = weekDates[6];
    if (mon.getMonth() === sun.getMonth()) {
      return `${MONTH_NAMES[mon.getMonth()]} ${mon.getDate()}–${sun.getDate()}`;
    }
    return `${MONTH_NAMES[mon.getMonth()]} ${mon.getDate()} – ${MONTH_NAMES[sun.getMonth()]} ${sun.getDate()}`;
  }

  return (
    <Box sx={{
      background: `linear-gradient(160deg, ${alpha(brand[50], 0.8)} 0%, ${alpha(accent[50], 0.8)} 100%)`,
      borderRadius: 4,
      border: `2px solid ${alpha(brand[400], 0.22)}`,
      boxShadow: `0 8px 32px ${alpha(accent[300], 0.18)}, 0 2px 8px ${alpha(brand[400], 0.1)}`,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <Box sx={{
        background: `linear-gradient(135deg, ${alpha(brand[400], 0.18)} 0%, ${alpha(accent[300], 0.22)} 100%)`,
        px: { xs: 2.5, sm: 3 }, pt: 2.5, pb: 1.5,
        borderBottom: `1.5px solid ${alpha(brand[400], 0.12)}`,
      }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography sx={{ fontSize: '1.3rem' }}>🌸</Typography>
            <Typography variant="h6" sx={{
              fontWeight: 800,
              background: `linear-gradient(90deg, ${brand[700]} 0%, ${accent[500]} 100%)`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>
              My To-Do List
            </Typography>
            <Typography sx={{ fontSize: '1rem' }}>✨</Typography>
          </Stack>

          {/* View toggle */}
          <Stack direction="row" spacing={0.5}>
            {(['week', 'month'] as const).map((v) => (
              <Box
                key={v}
                component="button"
                onClick={() => setView(v)}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 0.5,
                  px: 1.25, py: 0.6, borderRadius: 2.5, border: '1.5px solid',
                  borderColor: view === v ? brand[400] : alpha(brand[300], 0.4),
                  background: view === v ? `linear-gradient(135deg, ${brand[400]}, ${accent[300]})` : 'transparent',
                  color: view === v ? 'white' : brand[600],
                  fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  '&:hover': { borderColor: brand[400] },
                }}
              >
                {v === 'week' ? <ViewWeekRoundedIcon sx={{ fontSize: '0.95rem' }} /> : <CalendarMonthRoundedIcon sx={{ fontSize: '0.95rem' }} />}
                <span style={{ textTransform: 'capitalize' }}>{v}</span>
              </Box>
            ))}
          </Stack>
        </Stack>

        {view === 'week' && (
          <>
            {/* Week navigation */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
              <IconButton size="small" onClick={() => setWeekOffset((o) => o - 1)} sx={{ color: brand[600] }}>
                <ChevronLeftRoundedIcon sx={{ fontSize: '1.1rem' }} />
              </IconButton>
              <Typography variant="caption" sx={{ fontWeight: 700, color: brand[700] }}>
                {formatWeekRange()}
              </Typography>
              <IconButton size="small" onClick={() => setWeekOffset((o) => o + 1)} sx={{ color: brand[600] }}>
                <ChevronRightRoundedIcon sx={{ fontSize: '1.1rem' }} />
              </IconButton>
            </Stack>

            {/* Day tabs */}
            <Stack direction="row" spacing={0.5}>
              {weekDates.map((date, i) => {
                const dateISO = toISODate(date);
                const isSelected = i === selectedDayIndex;
                const isToday = dateISO === todayStr;
                const dayTodos = todos.filter((t) => isScheduledForDate(t, date));
                const dayCompleted = dayTodos.filter((t) => isCompletedOnDate(t, dateISO)).length;

                return (
                  <Box
                    key={i}
                    component="button"
                    onClick={() => setSelectedDayIndex(i)}
                    sx={{
                      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                      py: 0.75, px: 0.25, borderRadius: 2.5, border: '1.5px solid',
                      borderColor: isSelected ? brand[400] : alpha(brand[300], 0.35),
                      background: isSelected
                        ? `linear-gradient(135deg, ${brand[400]}, ${accent[300]})`
                        : isToday ? alpha(brand[100], 0.6) : 'transparent',
                      cursor: 'pointer', transition: 'all 0.2s ease',
                      '&:hover': { borderColor: brand[400], background: isSelected ? undefined : alpha(brand[100], 0.8) },
                    }}
                  >
                    <Typography sx={{ fontSize: '0.65rem', fontWeight: 800, color: isSelected ? 'white' : isToday ? brand[700] : 'text.secondary', lineHeight: 1.3 }}>
                      {DAY_LABELS[i]}
                    </Typography>
                    <Typography sx={{ fontSize: '0.8rem', fontWeight: 900, color: isSelected ? 'white' : isToday ? brand[700] : 'text.primary', lineHeight: 1.2 }}>
                      {date.getDate()}
                    </Typography>
                    {dayTodos.length > 0 && (
                      <Box sx={{
                        width: 6, height: 6, borderRadius: '50%', mt: 0.3,
                        bgcolor: dayCompleted === dayTodos.length
                          ? (isSelected ? 'white' : '#34D399')
                          : (isSelected ? alpha('#fff', 0.6) : alpha(brand[300], 0.6)),
                      }} />
                    )}
                  </Box>
                );
              })}
            </Stack>
          </>
        )}
      </Box>

      {/* Body */}
      <Box sx={{ px: { xs: 2, sm: 2.5 }, py: 1.5 }}>
        {view === 'month' ? (
          <MonthCalendar todos={todos} monthOffset={monthOffset} onMonthChange={setMonthOffset} />
        ) : (
          <>
            {/* Progress for selected day */}
            {totalCount > 0 && (
              <Box mb={1.5}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" mb={0.5}>
                  <Typography variant="caption" sx={{ color: 'secondary.dark', fontWeight: 800 }}>
                    {completedCount}/{totalCount} done
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                    {progress === 100 ? '🎊 All done!' : `Each task = +${XP_PER_TODO} XP ⭐`}
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate" value={progress}
                  sx={{
                    height: 7, borderRadius: 4,
                    bgcolor: alpha(brand[400], 0.12),
                    '& .MuiLinearProgress-bar': {
                      background: progress === 100
                        ? 'linear-gradient(90deg, #34D399, #60C8F5)'
                        : `linear-gradient(90deg, ${brand[400]}, ${accent[300]})`,
                      borderRadius: 4, transition: 'width 0.5s ease',
                    },
                  }}
                />
              </Box>
            )}

            {/* Add input */}
            <Stack spacing={1} mb={1.5}>
              <Stack direction="row" spacing={1} alignItems="center">
                <TextField
                  value={input} onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
                  placeholder="Add something fun to do... 🌟" size="small" fullWidth disabled={loading}
                  slotProps={{ htmlInput: { maxLength: 200 } }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3, fontSize: '0.875rem', fontWeight: 600, bgcolor: 'white' } }}
                />
                <Tooltip title="Add (Enter)">
                  <span>
                    <IconButton onClick={handleAdd} disabled={!input.trim() || loading} sx={{
                      background: `linear-gradient(135deg, ${brand[400]}, ${accent[300]})`,
                      color: 'white', borderRadius: 2.5, width: 38, height: 38, flexShrink: 0,
                      '&:hover': { background: `linear-gradient(135deg, ${brand[700]}, ${accent[500]})`, transform: 'scale(1.08)' },
                      '&:disabled': { background: 'rgba(0,0,0,0.1)', color: 'rgba(0,0,0,0.3)' },
                      transition: 'all 0.2s ease',
                    }}>
                      <AddRoundedIcon sx={{ fontSize: '1.2rem' }} />
                    </IconButton>
                  </span>
                </Tooltip>
              </Stack>
              <FrequencyPicker value={frequencyDays} onChange={setFrequencyDays} />
            </Stack>

            <Collapse in={!!celebration}>
              <Box sx={{
                textAlign: 'center', py: 1, mb: 1.5, borderRadius: 3,
                background: `linear-gradient(90deg, ${alpha(brand[400], 0.15)}, ${alpha(accent[300], 0.2)}, ${alpha(brand[400], 0.15)})`,
                animation: 'pulse-soft 1s ease infinite',
                '@keyframes pulse-soft': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.75 } },
              }}>
                <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', color: 'secondary.dark' }}>
                  {celebration} All done! 🎊
                </Typography>
              </Box>
            </Collapse>

            <Collapse in={!!error}>
              <Alert severity="error" onClose={clearError} sx={{ mb: 1.5, borderRadius: 2.5, fontSize: '0.82rem' }}>{error}</Alert>
            </Collapse>

            {loading ? (
              <Box sx={{ py: 2 }}>
                <LinearProgress sx={{ borderRadius: 2, bgcolor: alpha(brand[400], 0.1), '& .MuiLinearProgress-bar': { background: `linear-gradient(90deg, ${brand[400]}, ${accent[300]})` } }} />
                <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 1, color: 'text.secondary' }}>
                  Loading your list...
                </Typography>
              </Box>
            ) : todosForDay.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 2.5 }}>
                <Typography sx={{ fontSize: '2.2rem', mb: 1 }}>🌸</Typography>
                <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem', fontWeight: 600 }}>No tasks for this day!</Typography>
                <Typography sx={{ color: 'text.secondary', fontSize: '0.78rem', mt: 0.5, opacity: 0.7 }}>Add one above and set which days it repeats ⭐</Typography>
              </Box>
            ) : (
              <Stack spacing={1}>
                {[...todosForDay.filter((t) => !isCompletedOnDate(t, selectedDateISO)), ...todosForDay.filter((t) => isCompletedOnDate(t, selectedDateISO))].map((todo) => (
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
          </>
        )}
      </Box>
    </Box>
  );
}
