'use client';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import { useTheme, alpha } from '@mui/material/styles';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import type { Todo, CalendarEntry, EntryType } from '@/types/todo';
import {
  MONTH_NAMES, DEFAULT_ENTRY_TYPES,
  toISODate, todayISO, getMonthCalendarDates,
  isScheduledForDate, isCompletedOnDate, isEntryOnDate, getEntryType,
} from './helpers';

interface MonthCalendarProps {
  todos: Todo[];
  entries: CalendarEntry[];
  entryTypes: EntryType[];
  monthOffset: number;
  onMonthChange: (offset: number) => void;
}

export function MonthCalendar({ todos, entries, entryTypes, monthOffset, onMonthChange }: MonthCalendarProps) {
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

  function getEntriesForDate(date: Date) {
    return entries.filter((entry) => isEntryOnDate(entry, date));
  }

  function cellBg(date: Date) {
    const dateISO = toISODate(date);
    const isFuture = dateISO > todayStr;
    const { scheduled, completed } = getDayStats(date);
    const dayEntries = getEntriesForDate(date);
    if (isFuture && dayEntries.length === 0) return 'transparent';
    if (scheduled === 0 && dayEntries.length > 0) {
      return alpha(getEntryType(dayEntries[0].typeId, entryTypes).color, 0.18);
    }
    if (scheduled === 0) return 'transparent';
    if (completed === scheduled) return alpha(brand[300], 0.22);
    if (completed > 0) return alpha(accent[200], 0.25);
    return 'transparent';
  }

  return (
    <Box>
      {/* Month navigation */}
      <Stack direction="row" alignItems="center" justifyContent="center" spacing={1.5} mb={1.5}>
        <IconButton size="small" onClick={() => onMonthChange(monthOffset - 1)} sx={{ color: brand[500], p: 0.25 }}>
          <ChevronLeftRoundedIcon sx={{ fontSize: '1rem' }} />
        </IconButton>
        <Typography sx={{ fontWeight: 800, fontSize: '0.88rem', color: brand[700] }}>
          {MONTH_NAMES[month]} {year}
        </Typography>
        <IconButton size="small" onClick={() => onMonthChange(monthOffset + 1)} sx={{ color: brand[500], p: 0.25 }}>
          <ChevronRightRoundedIcon sx={{ fontSize: '1rem' }} />
        </IconButton>
      </Stack>

      {/* Day-of-week headers */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.4, mb: 0.5 }}>
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <Typography key={d} sx={{ textAlign: 'center', fontSize: '0.62rem', fontWeight: 800, color: 'text.disabled' }}>
            {d}
          </Typography>
        ))}
      </Box>

      {/* Calendar grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.4 }}>
        {calDates.map((date, i) => {
          if (!date) return <Box key={i} />;
          const dateISO = toISODate(date);
          const isToday = dateISO === todayStr;
          const isFuture = dateISO > todayStr;
          const { scheduled, completed } = getDayStats(date);
          const dayEntries = getEntriesForDate(date);
          const eventType = dayEntries.length ? getEntryType(dayEntries[0].typeId, entryTypes) : null;
          const allDone = scheduled > 0 && completed === scheduled;
          const someDone = completed > 0 && completed < scheduled;

          return (
            <Box key={i} sx={{
              aspectRatio: '1', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', borderRadius: 2,
              background: cellBg(date),
              border: '2px solid',
              borderColor: isToday ? brand[400] : 'transparent',
              opacity: isFuture ? 0.4 : 1,
            }}>
              <Typography sx={{
                fontSize: '0.7rem', fontWeight: isToday ? 900 : 600,
                color: isToday ? brand[700] : 'text.secondary',
                lineHeight: 1.2,
              }}>
                {date.getDate()}
              </Typography>
              {dayEntries.length > 0 && (
                <Typography sx={{ fontSize: '0.55rem', lineHeight: 1, color: eventType?.color || accent[600], fontWeight: 700, mt: 0.25 }}>
                  {dayEntries[0].emoji}{dayEntries.length > 1 ? `+${dayEntries.length - 1}` : ''}
                </Typography>
              )}
              {allDone && <Typography sx={{ fontSize: '0.55rem', lineHeight: 1 }}>⭐</Typography>}
              {someDone && !allDone && (
                <Typography sx={{ fontSize: '0.5rem', color: accent[600], fontWeight: 700, lineHeight: 1 }}>
                  {completed}/{scheduled}
                </Typography>
              )}
              {!allDone && !someDone && scheduled > 0 && !isFuture && (
                <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: alpha(brand[300], 0.5), mt: 0.2 }} />
              )}
            </Box>
          );
        })}
      </Box>

      {/* Legend */}
      <Stack direction="row" spacing={1.5} justifyContent="center" mt={1.5}>
        {[
          { label: 'All done', color: alpha(brand[300], 0.35) },
          { label: 'Some done', color: alpha(accent[200], 0.5) },
          { label: 'Event', color: alpha(DEFAULT_ENTRY_TYPES[0].color, 0.35) },
        ].map(({ label, color }) => (
          <Stack key={label} direction="row" spacing={0.4} alignItems="center">
            <Box sx={{ width: 8, height: 8, borderRadius: 1, bgcolor: color }} />
            <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.6rem' }}>{label}</Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}
