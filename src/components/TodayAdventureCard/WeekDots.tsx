'use client';

import Box from '@mui/material/Box';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import { localDateString } from '@/lib/chest';
import { studyDaysThisWeek, weekStartLocal } from '@/lib/studyWeek';

interface WeekDotsProps {
  sessions: Array<{ started_at: string; cards_studied: number }>;
  /** Today as a local YYYY-MM-DD string, passed in so the whole card agrees on it. */
  today: string;
}

/**
 * Seven dots, Monday→Sunday. A day fills on real study by the same rule
 * studyDaysThisWeek counts by — the two must not drift apart.
 */
export function WeekDots({ sessions, today }: WeekDotsProps) {
  const t = useTranslations('Home.adventure');

  const monday = weekStartLocal(new Date());
  const days = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    return localDateString(day);
  });

  const studied = new Set(
    sessions
      .filter((s) => s.cards_studied > 0)
      .map((s) => new Date(s.started_at))
      .filter((d) => !Number.isNaN(d.getTime()))
      .map(localDateString),
  );
  const count = studyDaysThisWeek(sessions);

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
      <Box
        role="img"
        aria-label={t('weekDotsAria')}
        sx={{ display: 'flex', gap: 0.75, flexShrink: 0 }}
      >
        {days.map((day) => (
          <Box
            key={day}
            aria-hidden
            sx={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              bgcolor: studied.has(day) ? '#fff' : alpha('#fff', 0.22),
              outline: day === today ? `2px solid ${alpha('#fff', 0.55)}` : 'none',
              outlineOffset: 2,
            }}
          />
        ))}
      </Box>
      {/* Silent at zero — seven empty dots say "fresh week"; "0 study days" scolds. */}
      {count > 0 && (
        <Typography
          variant="caption"
          sx={{ fontWeight: 700, color: alpha('#fff', 0.85), lineHeight: 1.2 }}
        >
          {t('daysThisWeek', { count })}
        </Typography>
      )}
    </Box>
  );
}
