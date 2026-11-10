'use client';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { calendarWeeks, WEEKDAY_KANJI } from '@/lib/calendarWords';

const WEEKS = calendarWeeks();
const DAYS = [...WEEKDAY_KANJI];

interface MiniCalendarProps {
  /** Column to box, 0 for Sunday. */
  highlight: number;
  label: string;
}

export function MiniCalendar({ highlight, label }: MiniCalendarProps) {
  return (
    <Box
      role="img"
      aria-label={label}
      sx={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        width: { xs: 252, sm: 308 },
        maxWidth: '100%',
        mx: 'auto',
        py: 0.75,
        border: '2px solid',
        borderColor: 'text.primary',
        borderRadius: 1.5,
        bgcolor: 'background.paper',
        color: 'text.primary',
        textAlign: 'center',
      }}
    >
      {DAYS.map((kanji) => (
        <Typography
          key={kanji}
          sx={{ fontSize: { xs: '1.15rem', sm: '1.35rem' }, fontWeight: 700 }}
        >
          {kanji}
        </Typography>
      ))}
      {WEEKS.flat().map((day, i) => (
        <Typography key={i} sx={{ fontSize: { xs: '0.72rem', sm: '0.8rem' }, lineHeight: 1.5 }}>
          {day ?? ''}
        </Typography>
      ))}
      <Box
        sx={{
          position: 'absolute',
          top: 3,
          bottom: 3,
          left: `${(highlight / 7) * 100}%`,
          width: `${100 / 7}%`,
          border: '3px solid',
          borderColor: 'primary.main',
          borderRadius: 1,
          pointerEvents: 'none',
        }}
      />
    </Box>
  );
}
