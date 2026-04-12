'use client';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import { useTheme, alpha } from '@mui/material/styles';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import TodayRoundedIcon from '@mui/icons-material/TodayRounded';
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
  selectedDateISO: string;
  onSelectDate: (dateISO: string) => void;
}

export function MonthCalendar({
  todos, entries, entryTypes, monthOffset, onMonthChange,
  selectedDateISO, onSelectDate,
}: MonthCalendarProps) {
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

  function cellBg(date: Date, isSelected: boolean) {
    if (isSelected) return `linear-gradient(145deg, ${brand[400]}, ${accent[300]})`;
    const dateISO = toISODate(date);
    const isFuture = dateISO > todayStr;
    const { scheduled, completed } = getDayStats(date);
    const dayEntries = getEntriesForDate(date);
    if (isFuture && dayEntries.length === 0 && scheduled === 0) return alpha('#fff', 0.5);
    if (scheduled === 0 && dayEntries.length > 0) {
      return alpha(getEntryType(dayEntries[0].typeId, entryTypes).color, 0.18);
    }
    if (scheduled === 0) return alpha('#fff', 0.5);
    if (completed === scheduled) return alpha(brand[300], 0.22);
    if (completed > 0) return alpha(accent[200], 0.25);
    return alpha('#fff', 0.5);
  }

  // Jump to today
  const handleGoToToday = () => {
    onMonthChange(0);
    onSelectDate(todayStr);
  };

  return (
    <Box>
      {/* Month navigation */}
      <Stack direction="row" alignItems="center" justifyContent="center" spacing={1} mb={1.5}>
        <IconButton size="small" onClick={() => onMonthChange(monthOffset - 1)} sx={{ color: brand[500], p: 0.25 }}>
          <ChevronLeftRoundedIcon sx={{ fontSize: '1.1rem' }} />
        </IconButton>
        <Typography sx={{ fontWeight: 800, fontSize: '0.92rem', color: brand[700] }}>
          {MONTH_NAMES[month]} {year}
        </Typography>
        <IconButton size="small" onClick={() => onMonthChange(monthOffset + 1)} sx={{ color: brand[500], p: 0.25 }}>
          <ChevronRightRoundedIcon sx={{ fontSize: '1.1rem' }} />
        </IconButton>
        {monthOffset !== 0 && (
          <IconButton size="small" onClick={handleGoToToday} sx={{ color: accent[500], p: 0.25 }}>
            <TodayRoundedIcon sx={{ fontSize: '1rem' }} />
          </IconButton>
        )}
      </Stack>

      {/* Day-of-week headers */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5, mb: 0.5 }}>
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <Typography key={d} sx={{ textAlign: 'center', fontSize: '0.68rem', fontWeight: 800, color: brand[500] }}>
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
          const isSelected = dateISO === selectedDateISO;
          const isFuture = dateISO > todayStr;
          const { scheduled, completed } = getDayStats(date);
          const dayEntries = getEntriesForDate(date);
          const allDone = scheduled > 0 && completed === scheduled;
          const someDone = completed > 0 && completed < scheduled;
          const hasContent = scheduled > 0 || dayEntries.length > 0;

          return (
            <Box
              key={i}
              component="button"
              onClick={() => onSelectDate(dateISO)}
              sx={{
                aspectRatio: '1',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 2.5,
                background: cellBg(date, isSelected),
                border: '2px solid',
                borderColor: isSelected ? brand[400] : isToday ? brand[300] : 'transparent',
                opacity: isFuture && !hasContent ? 0.45 : 1,
                cursor: 'pointer',
                p: 0,
                transition: 'all 0.2s ease',
                '&:hover': {
                  transform: 'scale(1.08)',
                  borderColor: brand[400],
                  boxShadow: `0 2px 10px ${alpha(brand[300], 0.25)}`,
                },
              }}
            >
              <Typography sx={{
                fontSize: '0.75rem',
                fontWeight: isToday || isSelected ? 900 : 600,
                color: isSelected ? 'white' : isToday ? brand[700] : 'text.secondary',
                lineHeight: 1.2,
              }}>
                {date.getDate()}
              </Typography>

              {/* Status indicators */}
              <Box sx={{ display: 'flex', gap: 0.2, alignItems: 'center', minHeight: 12 }}>
                {allDone && (
                  <Typography sx={{ fontSize: '0.55rem', lineHeight: 1 }}>⭐</Typography>
                )}
                {someDone && !allDone && (
                  <Typography sx={{
                    fontSize: '0.5rem',
                    color: isSelected ? 'rgba(255,255,255,0.9)' : accent[600],
                    fontWeight: 700, lineHeight: 1,
                  }}>
                    {completed}/{scheduled}
                  </Typography>
                )}
                {!allDone && !someDone && scheduled > 0 && !isFuture && (
                  <Box sx={{
                    width: 4, height: 4, borderRadius: '50%',
                    bgcolor: isSelected ? 'rgba(255,255,255,0.7)' : alpha(brand[300], 0.6),
                  }} />
                )}
                {dayEntries.length > 0 && (
                  <Typography sx={{ fontSize: '0.5rem', lineHeight: 1 }}>
                    {dayEntries[0].emoji}
                  </Typography>
                )}
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* Legend */}
      <Stack direction="row" spacing={1.5} justifyContent="center" mt={1.5} flexWrap="wrap" useFlexGap>
        {[
          { label: 'All done', icon: '⭐' },
          { label: 'In progress', color: alpha(accent[200], 0.5) },
          { label: 'Event', color: alpha(DEFAULT_ENTRY_TYPES[1].color, 0.35) },
          { label: 'Today', border: brand[300] },
        ].map(({ label, color, icon, border }) => (
          <Stack key={label} direction="row" spacing={0.4} alignItems="center">
            {icon ? (
              <Typography sx={{ fontSize: '0.55rem', lineHeight: 1 }}>{icon}</Typography>
            ) : (
              <Box sx={{
                width: 8, height: 8, borderRadius: 1,
                bgcolor: color || 'transparent',
                border: border ? `2px solid ${border}` : 'none',
              }} />
            )}
            <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.6rem' }}>{label}</Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}
