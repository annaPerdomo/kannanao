'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTheme, alpha } from '@mui/material/styles';
import type { StudySession, SessionMode } from '@/hooks/useProgress';
import { modeLabel, modeColor, sessionLocalDate } from './constants';

export function PeriodSummary({ sessions }: { sessions: StudySession[] }) {
  const theme = useTheme();
  const { brand } = theme.palette;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dayOfWeek = today.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - daysToMonday);

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const withCards = sessions.filter((s) => s.cards_studied > 0);

  const forPeriod = (start: Date) =>
    withCards.filter((s) => new Date(s.started_at) >= start);

  const aggregate = (list: StudySession[]) => ({
    sessions: list.length,
    cards: list.reduce((n, s) => n + s.cards_studied, 0),
    xp: list.reduce((n, s) => n + s.xp_earned, 0),
    days: new Set(list.map((s) => sessionLocalDate(s.started_at))).size,
  });

  const week = aggregate(forPeriod(weekStart));
  const month = aggregate(forPeriod(monthStart));

  const monthName = today.toLocaleDateString(undefined, { month: 'long' });

  const monthSessions = forPeriod(monthStart);
  const modeCounts = monthSessions.reduce<Record<string, number>>((acc, s) => {
    const key = s.practice_mode ?? 'study';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const modeBreakdown = Object.entries(modeCounts).sort((a, b) => b[1] - a[1]);

  const PeriodCard = ({
    title,
    data,
  }: {
    title: string;
    data: { sessions: number; cards: number; xp: number; days: number };
  }) => (
    <Box
      sx={{
        flex: '1 1 0',
        background: alpha(brand[300], 0.22),
        border: `1px solid ${alpha(brand[300], 0.40)}`,
        borderRadius: 3,
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
      }}
    >
      <Typography
        sx={{ fontFamily: (t) => t.fonts.cute, fontWeight: 600, fontSize: '0.78rem', color: brand[700] }}
      >
        {title}
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {[
          { label: 'Days studied', value: data.days },
          { label: 'Cards studied', value: data.cards.toLocaleString() },
          { label: 'XP earned', value: `+${data.xp.toLocaleString()}` },
          { label: 'Sessions', value: data.sessions },
        ].map(({ label, value }) => (
          <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>{label}</Typography>
            <Typography
              sx={{ fontFamily: (t) => t.fonts.cute, fontWeight: 700, fontSize: '1rem', color: brand[700] }}
            >
              {value}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box sx={{ display: 'flex', gap: 1.5 }}>
        <PeriodCard title="This Week" data={week} />
        <PeriodCard title={monthName} data={month} />
      </Box>

      {modeBreakdown.length > 0 && (
        <Box
          sx={{
            background: alpha(brand[300], 0.22),
            border: `1px solid ${alpha(brand[300], 0.40)}`,
            borderRadius: 3,
            p: 2,
          }}
        >
          <Typography
            sx={{ fontFamily: (t) => t.fonts.cute, fontWeight: 600, fontSize: '0.78rem', color: brand[700], mb: 1 }}
          >
            {monthName} by mode
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            {modeBreakdown.map(([mode, count]) => {
              const color = modeColor(mode as SessionMode);
              return (
                <Box
                  key={mode}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    px: 1.25,
                    py: 0.4,
                    borderRadius: 99,
                    bgcolor: alpha(color, 0.12),
                    border: `1px solid ${alpha(color, 0.30)}`,
                  }}
                >
                  <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color }}>
                    {modeLabel(mode as SessionMode)}
                  </Typography>
                  <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>
                    ×{count}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </Box>
      )}
    </Box>
  );
}
