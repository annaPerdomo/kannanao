'use client';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import { useTheme, alpha } from '@mui/material/styles';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import type { Todo, CalendarEntry } from '@/types/todo';
import {
  DAY_LABELS, toISODate, todayISO,
  isScheduledForDate, isCompletedOnDate, isEntryOnDate, formatWeekRange,
} from './helpers';

interface WeekStripProps {
  weekDates: Date[];
  selectedDayIndex: number;
  onSelectDay: (index: number) => void;
  weekOffset: number;
  onWeekChange: (delta: number) => void;
  todos: Todo[];
  entries: CalendarEntry[];
}

export function WeekStrip({
  weekDates, selectedDayIndex, onSelectDay,
  weekOffset, onWeekChange, todos, entries,
}: WeekStripProps) {
  const theme = useTheme();
  const { brand, accent } = theme.palette;
  const todayStr = todayISO();

  return (
    <Box>
      {/* Day pills — compact row */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: 0.5,
        mb: 1,
        p: 0.5,
        borderRadius: 3.5,
        background: alpha(brand[100], 0.4),
        border: `1.5px solid ${alpha(brand[200], 0.3)}`,
      }}>
        {weekDates.map((date, i) => {
          const dateISO = toISODate(date);
          const isSelected = i === selectedDayIndex;
          const isToday = dateISO === todayStr;
          const dayTodos = todos.filter((t) => isScheduledForDate(t, date));
          const dayCompleted = dayTodos.filter((t) => isCompletedOnDate(t, dateISO)).length;
          const dayEntries = entries.filter((entry) => isEntryOnDate(entry, date));
          const allDone = dayTodos.length > 0 && dayCompleted === dayTodos.length;

          return (
            <Box
              key={i}
              component="button"
              onClick={() => onSelectDay(i)}
              sx={{
                minHeight: 52,
                px: 0.25,
                py: 0.5,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.15,
                borderRadius: 2.5,
                border: '2px solid',
                borderColor: isSelected ? brand[400] : 'transparent',
                background: isSelected
                  ? `linear-gradient(145deg, ${brand[400]}, ${accent[300]})`
                  : isToday
                    ? alpha(brand[100], 0.8)
                    : alpha('#fff', 0.7),
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: `0 3px 10px ${alpha(brand[300], 0.25)}`,
                },
              }}
            >
              <Typography sx={{
                fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.03em',
                color: isSelected ? 'rgba(255,255,255,0.85)' : isToday ? brand[600] : 'text.disabled',
                lineHeight: 1,
              }}>
                {DAY_LABELS[i]}
              </Typography>
              <Typography sx={{
                fontSize: '0.92rem', fontWeight: 900,
                color: isSelected ? 'white' : isToday ? brand[700] : 'text.primary',
                lineHeight: 1.1,
              }}>
                {date.getDate()}
              </Typography>
              {/* Tiny status indicator */}
              {allDone ? (
                <Typography sx={{ fontSize: '0.55rem', lineHeight: 1 }}>⭐</Typography>
              ) : dayTodos.length > 0 ? (
                <Box sx={{
                  width: 5, height: 5, borderRadius: '50%',
                  bgcolor: isSelected ? 'rgba(255,255,255,0.7)' : brand[300],
                }}/>
              ) : dayEntries.length > 0 ? (
                <Typography sx={{ fontSize: '0.55rem', lineHeight: 1 }}>{dayEntries[0].emoji}</Typography>
              ) : null}
            </Box>
          );
        })}
      </Box>

      {/* Week navigation */}
      <Stack direction="row" alignItems="center" justifyContent="center" spacing={1} mb={0.5}>
        <IconButton size="small" onClick={() => onWeekChange(weekOffset - 1)} sx={{ color: brand[500], p: 0.25 }}>
          <ChevronLeftRoundedIcon sx={{ fontSize: '1rem' }} />
        </IconButton>
        <Typography variant="caption" sx={{ fontWeight: 800, color: brand[600], fontSize: '0.72rem' }}>
          {formatWeekRange(weekDates)}
        </Typography>
        <IconButton size="small" onClick={() => onWeekChange(weekOffset + 1)} sx={{ color: brand[500], p: 0.25 }}>
          <ChevronRightRoundedIcon sx={{ fontSize: '1rem' }} />
        </IconButton>
      </Stack>
    </Box>
  );
}
