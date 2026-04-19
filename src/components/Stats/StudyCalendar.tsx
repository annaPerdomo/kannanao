'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import { useTheme, alpha } from '@mui/material/styles';
import { FONT_DISPLAY } from '@/theme';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import type { StudySession } from '@/hooks/useProgress';
import { toLocalDateStr, sessionLocalDate } from './constants';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function StudyCalendar({ sessions }: { sessions: StudySession[] }) {
  const theme = useTheme();
  const { brand } = theme.palette;

  const todayReal = new Date();
  todayReal.setHours(0, 0, 0, 0);
  const todayStr = toLocalDateStr(todayReal);

  const [viewYear, setViewYear] = useState<number>(todayReal.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(todayReal.getMonth());

  const activityMap = new Map<string, number>();
  sessions.forEach((s) => {
    if (s.cards_studied === 0) return;
    const key = sessionLocalDate(s.started_at);
    activityMap.set(key, (activityMap.get(key) ?? 0) + s.cards_studied);
  });

  const goBack = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const goForward = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  const isCurrentMonth = viewYear === todayReal.getFullYear() && viewMonth === todayReal.getMonth();

  const firstDay = new Date(viewYear, viewMonth, 1);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const startOffset = (firstDay.getDay() + 6) % 7;

  const cells: (number | null)[] = [
    ...Array.from({ length: startOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const cellBg = (cards: number) => {
    if (cards === 0) return undefined;
    if (cards < 5)  return alpha(brand[300], 0.35);
    if (cards < 15) return alpha(brand[300], 0.65);
    if (cards < 30) return brand[300];
    return brand[700];
  };

  const monthLabel = firstDay.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <IconButton size="small" onClick={goBack} sx={{ color: brand[700] }}>
          <ChevronLeftIcon fontSize="small" />
        </IconButton>
        <Typography sx={{ fontFamily: FONT_DISPLAY, fontSize: '0.9rem', color: brand[700] }}>
          {monthLabel}
        </Typography>
        <IconButton size="small" onClick={goForward} disabled={isCurrentMonth} sx={{ color: brand[700] }}>
          <ChevronRightIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5, mb: 0.5 }}>
        {DAY_LABELS.map((d) => (
          <Typography key={d} sx={{ fontSize: '0.62rem', color: 'text.secondary', textAlign: 'center', fontWeight: 600 }}>
            {d}
          </Typography>
        ))}
      </Box>

      {weeks.map((week, wi) => (
        <Box key={wi} sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5, mb: 0.5 }}>
          {week.map((day, di) => {
            if (day === null) return <Box key={di} />;

            const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isFuture = dateStr > todayStr;
            const isToday = dateStr === todayStr;
            const cards = activityMap.get(dateStr) ?? 0;
            const bg = isFuture ? undefined : cellBg(cards);
            const textColor = cards >= 30 ? '#fff' : isToday ? brand[700] : 'text.primary';

            return (
              <Tooltip key={dateStr} title={isFuture || cards === 0 ? '' : `${cards} cards studied`} arrow>
                <Box
                  sx={{
                    position: 'relative',
                    aspectRatio: '1',
                    borderRadius: '8px',
                    backgroundColor: bg,
                    border: isToday ? `2px solid ${brand[700]}` : '2px solid transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'default',
                    opacity: isFuture ? 0.25 : 1,
                    transition: 'opacity 0.15s',
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: { xs: '0.65rem', sm: '0.75rem' },
                      fontWeight: isToday ? 700 : 400,
                      color: textColor,
                      lineHeight: 1,
                    }}
                  >
                    {day}
                  </Typography>
                  {cards > 0 && !isFuture && (
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: '3px',
                        width: 4,
                        height: 4,
                        borderRadius: '50%',
                        backgroundColor: cards >= 30 ? 'rgba(255,255,255,0.8)' : brand[700],
                      }}
                    />
                  )}
                </Box>
              </Tooltip>
            );
          })}
        </Box>
      ))}
    </Box>
  );
}
