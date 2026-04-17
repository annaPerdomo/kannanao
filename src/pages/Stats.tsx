'use client';

import { useState } from 'react';
import {
  Box,
  Typography,
  LinearProgress,
  Chip,
  Tooltip,
  Skeleton,
  Paper,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SchoolIcon from '@mui/icons-material/School';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import IconButton from '@mui/material/IconButton';
import { useProgress, xpProgressInLevel, ACHIEVEMENTS, StudySession, SessionMode } from '@/hooks/useProgess';

// ─── Small stat card ─────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: string;
  accent?: string;
}) {
  const theme = useTheme();
  const { brand } = theme.palette;
  const color = accent ?? brand[700];

  return (
    <Paper
      elevation={0}
      sx={{
        flex: '1 1 160px',
        minWidth: 140,
        background: alpha(brand[50], 0.6),
        border: `1px solid ${alpha(brand[300], 0.40)}`,
        borderRadius: 4,
        p: 2.5,
        display: 'flex',
        flexDirection: 'column',
        gap: 0.5,
        transition: 'box-shadow 0.2s',
        '&:hover': { boxShadow: `0 4px 20px ${alpha(brand[700], 0.12)}` },
      }}
    >
      <Box sx={{ color, display: 'flex', alignItems: 'center', gap: 0.75 }}>
        {icon}
        <Typography
          sx={{
            fontFamily: '"DM Serif Display", serif',
            fontSize: '0.78rem',
            color: 'text.secondary',
            letterSpacing: '0.02em',
          }}
        >
          {label}
        </Typography>
      </Box>
      <Typography
        sx={{
          fontFamily: '"DM Serif Display", serif',
          fontSize: '2rem',
          color,
          lineHeight: 1.1,
          fontWeight: 400,
        }}
      >
        {value}
      </Typography>
      {sub && (
        <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>{sub}</Typography>
      )}
    </Paper>
  );
}

// ─── XP level bar ────────────────────────────────────────────────────────────

function LevelBar({ totalXp, level }: { totalXp: number; level: number }) {
  const theme = useTheme();
  const { brand } = theme.palette;
  const { current, needed } = xpProgressInLevel(totalXp);
  const pct = Math.round((current / needed) * 100);

  return (
    <Paper
      elevation={0}
      sx={{
        background: alpha(brand[50], 0.6),
        border: `1px solid ${alpha(brand[300], 0.40)}`,
        borderRadius: 4,
        p: 3,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AutoAwesomeIcon sx={{ color: brand[700], fontSize: '1.1rem' }} />
          <Typography
            sx={{ fontFamily: '"DM Serif Display", serif', fontSize: '1rem', color: brand[700] }}
          >
            Level {level}
          </Typography>
        </Box>
        <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
          {current.toLocaleString()} / {needed.toLocaleString()} XP
        </Typography>
      </Box>

      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{
          height: 12,
          borderRadius: 6,
          backgroundColor: alpha(brand[300], 0.22),
          '& .MuiLinearProgress-bar': {
            borderRadius: 6,
            background: `linear-gradient(90deg, ${brand[300]} 0%, ${brand[700]} 100%)`,
          },
        }}
      />

      <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', textAlign: 'right' }}>
        {pct}% to Level {level + 1} ✨
      </Typography>
    </Paper>
  );
}

// ─── Achievement badge ────────────────────────────────────────────────────────

function AchievementBadge({
  achievementKey,
  unlocked,
  unlockedAt,
}: {
  achievementKey: string;
  unlocked: boolean;
  unlockedAt?: string;
}) {
  const def = ACHIEVEMENTS.find((a) => a.key === achievementKey);
  if (!def) return null;

  const label = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.75,
        p: 1.5,
        width: 100,
        opacity: unlocked ? 1 : 0.35,
        filter: unlocked ? 'none' : 'grayscale(100%)',
        transition: 'all 0.2s',
        cursor: unlocked ? 'default' : 'not-allowed',
      }}
    >
      <Box
        sx={{
          width: 54,
          height: 54,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.7rem',
          background: unlocked ? `${def.color}20` : 'rgba(0,0,0,0.06)',
          border: `2px solid ${unlocked ? def.color + '60' : 'transparent'}`,
          boxShadow: unlocked ? `0 0 12px ${def.color}30` : 'none',
        }}
      >
        {unlocked ? def.emoji : '🔒'}
      </Box>
      <Typography
        sx={{
          fontSize: '0.65rem',
          fontWeight: 600,
          textAlign: 'center',
          color: unlocked ? 'text.primary' : 'text.secondary',
          lineHeight: 1.3,
        }}
      >
        {unlocked ? def.label : '???'}
      </Typography>
    </Box>
  );

  return (
    <Tooltip
      title={
        unlocked
          ? `${def.description}${unlockedAt ? ` · Unlocked ${new Date(unlockedAt).toLocaleDateString()}` : ''}`
          : def.description
      }
      arrow
    >
      <Box>{label}</Box>
    </Tooltip>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toLocalDateStr(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function sessionLocalDate(started_at: string): string {
  return toLocalDateStr(new Date(started_at));
}

// ─── Monthly calendar ─────────────────────────────────────────────────────────

function StudyCalendar({ sessions }: { sessions: StudySession[] }) {
  const theme = useTheme();
  const { brand } = theme.palette;

  const todayReal = new Date();
  todayReal.setHours(0, 0, 0, 0);
  const todayStr = toLocalDateStr(todayReal);

  const [viewYear, setViewYear] = useState<number>(todayReal.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(todayReal.getMonth()); // 0-indexed

  // cards studied per local date — count any session with cards, even if not formally ended
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

  // First day of month and total days
  const firstDay = new Date(viewYear, viewMonth, 1);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  // Monday-based offset (0=Mon … 6=Sun)
  const startOffset = (firstDay.getDay() + 6) % 7;

  // Build flat cell array: nulls for padding + day numbers
  const cells: (number | null)[] = [
    ...Array.from({ length: startOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad end to complete last row
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

  const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const monthLabel = firstDay.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return (
    <Box>
      {/* Month navigation */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <IconButton size="small" onClick={goBack} sx={{ color: brand[700] }}>
          <ChevronLeftIcon fontSize="small" />
        </IconButton>
        <Typography sx={{ fontFamily: '"DM Serif Display", serif', fontSize: '0.9rem', color: brand[700] }}>
          {monthLabel}
        </Typography>
        <IconButton size="small" onClick={goForward} disabled={isCurrentMonth} sx={{ color: brand[700] }}>
          <ChevronRightIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Day-of-week headers */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5, mb: 0.5 }}>
        {DAY_LABELS.map((d) => (
          <Typography key={d} sx={{ fontSize: '0.62rem', color: 'text.secondary', textAlign: 'center', fontWeight: 600 }}>
            {d}
          </Typography>
        ))}
      </Box>

      {/* Calendar grid */}
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
              <Tooltip
                key={dateStr}
                title={isFuture || cards === 0 ? '' : `${cards} cards studied`}
                arrow
              >
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
                    cursor: cards > 0 ? 'default' : 'default',
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

// ─── Period summary (week / month) ───────────────────────────────────────────

function PeriodSummary({ sessions }: { sessions: StudySession[] }) {
  const theme = useTheme();
  const { brand } = theme.palette;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dayOfWeek = today.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - daysToMonday);

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  // Count any session with cards recorded, whether or not it has ended_at
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

  // Mode breakdown for the current month
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
        sx={{ fontFamily: '"DM Serif Display", serif', fontSize: '0.78rem', color: brand[700] }}
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
              sx={{ fontFamily: '"DM Serif Display", serif', fontSize: '1rem', color: brand[700] }}
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
            sx={{ fontFamily: '"DM Serif Display", serif', fontSize: '0.78rem', color: brand[700], mb: 1 }}
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

// ─── Mode helpers ─────────────────────────────────────────────────────────────

const MODE_LABELS: Record<SessionMode, string> = {
  study:         'Study',
  match:         'Match',
  fill:          'Fill',
  recall:        'Recall',
  speech_read:   'Read-Through',
  speech_recall: 'Line Recall',
};

const MODE_COLORS: Record<SessionMode, string> = {
  study:         '#6366F1',
  match:         '#10B981',
  fill:          '#F59E0B',
  recall:        '#3B82F6',
  speech_read:   '#EC4899',
  speech_recall: '#8B5CF6',
};

function modeLabel(mode: SessionMode | null | undefined): string {
  return mode ? (MODE_LABELS[mode] ?? mode) : 'Study';
}

function modeColor(mode: SessionMode | null | undefined): string {
  return mode ? (MODE_COLORS[mode] ?? '#6366F1') : '#6366F1';
}

// ─── Recent sessions ──────────────────────────────────────────────────────────

function SessionRow({
  correct,
  studied,
  xp,
  date,
  secs,
  mode,
}: {
  correct: number;
  studied: number;
  xp: number;
  date: string;
  secs: number;
  mode: SessionMode | null;
}) {
  const theme = useTheme();
  const { brand } = theme.palette;
  const pct = studied > 0 ? Math.round((correct / studied) * 100) : 0;
  const mins = Math.round(secs / 60);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        py: 1.25,
        borderBottom: `1px solid ${alpha(brand[300], 0.40)}`,
        '&:last-child': { borderBottom: 'none' },
      }}
    >
      <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', minWidth: 72 }}>
        {new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
      </Typography>

      <Chip
        label={modeLabel(mode)}
        size="small"
        sx={{
          bgcolor: alpha(modeColor(mode), 0.12),
          color: modeColor(mode),
          fontWeight: 700,
          fontSize: '0.62rem',
          height: 20,
          border: `1px solid ${alpha(modeColor(mode), 0.30)}`,
          flexShrink: 0,
        }}
      />

      <Box sx={{ flex: 1 }}>
        <LinearProgress
          variant="determinate"
          value={pct}
          sx={{
            height: 7,
            borderRadius: 4,
            backgroundColor: alpha(brand[300], 0.22),
            '& .MuiLinearProgress-bar': {
              borderRadius: 4,
              backgroundColor: pct === 100 ? '#10B981' : brand[700],
            },
          }}
        />
      </Box>

      <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', minWidth: 36 }}>
        {pct}%
      </Typography>

      <Chip
        label={`+${xp} XP`}
        size="small"
        sx={{
          bgcolor: alpha(brand[300], 0.22),
          color: brand[700],
          fontWeight: 700,
          fontSize: '0.68rem',
          height: 22,
          border: `1px solid ${alpha(brand[300], 0.40)}`,
        }}
      />

      <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', minWidth: 40 }}>
        {mins}m
      </Typography>
    </Box>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Stats() {
  const theme = useTheme();
  const { brand } = theme.palette;
  const { progress, spendableXp, achievements, recentSessions, loading } = useProgress();

  const accuracy =
    progress && progress.total_cards_studied > 0
      ? Math.round((progress.total_correct / progress.total_cards_studied) * 100)
      : 0;

  const unlockedKeys = new Set(achievements.map((a) => a.achievement_key));

  return (
    <Box
      sx={{
        maxWidth: 860,
        mx: 'auto',
        px: { xs: 2, sm: 4 },
        py: 4,
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
      }}
    >
      {/* ── Page header ── */}
      <Box>
        <Typography
          sx={{
            fontFamily: '"DM Serif Display", serif',
            fontSize: { xs: '1.6rem', sm: '2rem' },
            color: brand[700],
            lineHeight: 1.1,
          }}
        >
          🌸 My Progress
        </Typography>
        <Typography sx={{ fontSize: '0.88rem', color: 'text.secondary', mt: 0.5 }}>
          Keep studying every day to build your streak!
        </Typography>
      </Box>

      {/* ── Level bar ── */}
      {loading ? (
        <Skeleton variant="rounded" height={96} sx={{ borderRadius: 4 }} />
      ) : progress ? (
        <LevelBar totalXp={progress.total_xp} level={progress.level} />
      ) : null}

      {/* ── Stat cards row ── */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={110} sx={{ flex: '1 1 160px', borderRadius: 4 }} />
          ))
        ) : progress ? (
          <>
            <StatCard
              icon={<LocalFireDepartmentIcon sx={{ fontSize: '1.1rem' }} />}
              label="Day Streak"
              value={progress.streak_days}
              sub={`Best: ${progress.longest_streak} days`}
              accent="#EF4444"
            />
            <StatCard
              icon={<SchoolIcon sx={{ fontSize: '1.1rem' }} />}
              label="Cards Studied"
              value={progress.total_cards_studied.toLocaleString()}
              sub={`${progress.total_sessions} sessions`}
            />
            <StatCard
              icon={<EmojiEventsIcon sx={{ fontSize: '1.1rem' }} />}
              label="Accuracy"
              value={`${accuracy}%`}
              sub={`${progress.total_correct} correct`}
              accent="#F59E0B"
            />
            <StatCard
              icon={<AutoAwesomeIcon sx={{ fontSize: '1.1rem' }} />}
              label="Total XP"
              value={progress.total_xp.toLocaleString()}
              sub={`${spendableXp.toLocaleString()} spendable · Level ${progress.level}`}
            />
          </>
        ) : null}
      </Box>

      {/* ── Achievements ── */}
      <Paper
        elevation={0}
        sx={{
          background: alpha(brand[50], 0.6),
          border: `1px solid ${alpha(brand[300], 0.40)}`,
          borderRadius: 4,
          p: 3,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
          <EmojiEventsIcon sx={{ color: brand[700], fontSize: '1.1rem' }} />
          <Typography
            sx={{ fontFamily: '"DM Serif Display", serif', fontSize: '1rem', color: brand[700] }}
          >
            Achievements
          </Typography>
          <Chip
            label={`${unlockedKeys.size} / ${ACHIEVEMENTS.length}`}
            size="small"
            sx={{
              ml: 'auto',
              bgcolor: alpha(brand[300], 0.22),
              color: brand[700],
              fontWeight: 700,
              fontSize: '0.68rem',
              height: 22,
              border: `1px solid ${alpha(brand[300], 0.40)}`,
            }}
          />
        </Box>

        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 0.5,
          }}
        >
          {loading
            ? Array.from({ length: 11 }).map((_, i) => (
                <Skeleton key={i} variant="circular" width={54} height={54} sx={{ m: 1 }} />
              ))
            : ACHIEVEMENTS.map((def) => {
                const found = achievements.find((a) => a.achievement_key === def.key);
                return (
                  <AchievementBadge
                    key={def.key}
                    achievementKey={def.key}
                    unlocked={unlockedKeys.has(def.key)}
                    unlockedAt={found?.unlocked_at}
                  />
                );
              })}
        </Box>
      </Paper>

      {/* ── Recent Sessions ── */}
      <Paper
        elevation={0}
        sx={{
          background: alpha(brand[50], 0.6),
          border: `1px solid ${alpha(brand[300], 0.40)}`,
          borderRadius: 4,
          p: 3,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <CalendarTodayIcon sx={{ color: brand[700], fontSize: '1rem' }} />
          <Typography
            sx={{ fontFamily: '"DM Serif Display", serif', fontSize: '1rem', color: brand[700] }}
          >
            Recent Sessions
          </Typography>
        </Box>

        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height={44} sx={{ my: 0.5 }} />
          ))
        ) : recentSessions.length === 0 ? (
          <Typography sx={{ fontSize: '0.88rem', color: 'text.secondary', py: 2, textAlign: 'center' }}>
            No sessions yet — start studying to see your history! 🌸
          </Typography>
        ) : (
          recentSessions
            .filter((s) => s.ended_at && s.cards_studied > 0)
            .map((s) => (
              <SessionRow
                key={s.id}
                correct={s.cards_correct}
                studied={s.cards_studied}
                xp={s.xp_earned}
                date={s.started_at}
                secs={s.duration_secs}
                mode={s.practice_mode}
              />
            ))
        )}
      </Paper>

      {/* ── Activity calendar + period summaries ── */}
      <Paper
        elevation={0}
        sx={{
          background: alpha(brand[50], 0.6),
          border: `1px solid ${alpha(brand[300], 0.40)}`,
          borderRadius: 4,
          p: 3,
          display: 'flex',
          flexDirection: 'column',
          gap: 2.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CalendarTodayIcon sx={{ color: brand[700], fontSize: '1rem' }} />
          <Typography
            sx={{ fontFamily: '"DM Serif Display", serif', fontSize: '1rem', color: brand[700] }}
          >
            Study Activity
          </Typography>
        </Box>

        {loading ? (
          <>
            <Skeleton variant="rounded" height={100} sx={{ borderRadius: 2 }} />
            <Skeleton variant="rounded" height={120} sx={{ borderRadius: 2 }} />
          </>
        ) : (
          <>
            <PeriodSummary sessions={recentSessions} />
            <StudyCalendar sessions={recentSessions} />
          </>
        )}
      </Paper>
    </Box>
  );
}
