'use client';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import type { CalendarEntry, Todo } from '@/types/todo';

import {
  DAY_LABELS,
  formatWeekRange,
  isCompletedOnDate,
  isEntryOnDate,
  isScheduledForDate,
  todayISO,
  toISODate,
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

// Cute mascot emoji per weekday (Mon→Sun)
const DAY_MASCOTS = ['🐱', '🐰', '🌸', '🧸', '⭐', '🦋', '☀️'];

export function WeekStrip({
  weekDates,
  selectedDayIndex,
  onSelectDay,
  weekOffset,
  onWeekChange,
  todos,
  entries,
}: WeekStripProps) {
  const theme = useTheme();
  const { brand, rainbow } = theme.palette;
  const todayStr = todayISO();

  const TAB_COLORS = [
    rainbow[50],
    rainbow[100],
    rainbow[200],
    rainbow[300],
    rainbow[400],
    rainbow[500],
    rainbow[600],
  ];

  return (
    <Box>
      {/* Horizontal Day Tabs */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 0.75,
          mb: 1,
          position: 'relative',
          height: 80, // Provide space for tabs to "stick out"
        }}
      >
        {weekDates.map((date, i) => {
          const dateISO = toISODate(date);
          const isSelected = i === selectedDayIndex;
          const isToday = dateISO === todayStr;
          const dayTodos = todos.filter((t) => isScheduledForDate(t, date));
          const dayCompleted = dayTodos.filter((t) => isCompletedOnDate(t, dateISO)).length;
          const dayEntries = entries.filter((entry) => isEntryOnDate(entry, date));
          const allDone = dayTodos.length > 0 && dayCompleted === dayTodos.length;
          const tabColor = TAB_COLORS[i % TAB_COLORS.length];

          return (
            <Box
              key={i}
              component="button"
              onClick={() => onSelectDay(i)}
              sx={{
                position: 'relative',
                height: isSelected ? 76 : 64,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.5,
                border: 'none',
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
                background: isSelected ? tabColor : alpha(tabColor, 0.45),
                color: isSelected ? 'white' : 'text.primary',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: isSelected
                  ? `0 -5px 15px ${alpha(tabColor, 0.45)}`
                  : `0 -2px 5px ${alpha(tabColor, 0.2)}`,
                transform: isSelected ? 'translateY(0px)' : 'translateY(12px)',
                zIndex: isSelected ? 10 : 1,
                '&:hover': {
                  transform: 'translateY(4px)',
                  height: 70,
                  zIndex: 11,
                  background: isSelected ? tabColor : alpha(tabColor, 0.6),
                },
              }}
            >
              <Typography
                sx={{
                  fontSize: '1.1rem',
                  lineHeight: 1,
                  filter: isSelected ? 'saturate(1.2)' : 'saturate(0.8) opacity(0.7)',
                  transition: 'filter 0.3s',
                }}
              >
                {allDone ? '💖' : DAY_MASCOTS[i]}
              </Typography>
              <Typography
                sx={{
                  fontFamily: (t) => t.fonts.cute,
                  fontSize: '0.6rem',
                  fontWeight: 800,
                  color: isSelected ? 'rgba(255,255,255,0.9)' : theme.palette.text.primary,
                  lineHeight: 1,
                }}
              >
                {DAY_LABELS[i]}
              </Typography>
              <Typography
                sx={{
                  fontFamily: (t) => t.fonts.cute,
                  fontSize: '0.9rem',
                  fontWeight: 900,
                  color: isSelected ? 'white' : isToday ? brand[700] : theme.palette.text.primary,
                  lineHeight: 1.2,
                }}
              >
                {date.getDate()}
              </Typography>

              {/* Status indicator */}
              <Box sx={{ position: 'absolute', bottom: 8, display: 'flex', alignItems: 'center' }}>
                {!allDone && dayEntries.length > 0 ? (
                  <Typography sx={{ fontSize: '0.65rem', lineHeight: 1 }}>
                    {dayEntries[0].emoji}
                  </Typography>
                ) : null}
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* Week navigation */}
      <Stack direction="row" alignItems="center" justifyContent="center" spacing={1} mb={0.5}>
        <IconButton
          size="small"
          onClick={() => onWeekChange(weekOffset - 1)}
          sx={{ color: brand[500], p: 0.25 }}
        >
          <ChevronLeftRoundedIcon sx={{ fontSize: '1rem' }} />
        </IconButton>
        <Typography
          variant="caption"
          sx={{
            fontFamily: (t) => t.fonts.cute,
            fontWeight: 800,
            color: brand[600],
            fontSize: '0.72rem',
          }}
        >
          {formatWeekRange(weekDates)}
        </Typography>
        <IconButton
          size="small"
          onClick={() => onWeekChange(weekOffset + 1)}
          sx={{ color: brand[500], p: 0.25 }}
        >
          <ChevronRightRoundedIcon sx={{ fontSize: '1rem' }} />
        </IconButton>
      </Stack>
    </Box>
  );
}
