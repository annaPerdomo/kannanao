'use client';

import {
  Box,
  Typography,
  LinearProgress,
  Chip,
  Tooltip,
  Skeleton,
  Paper,
} from '@mui/material';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SchoolIcon from '@mui/icons-material/School';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { useProgress, xpProgressInLevel, ACHIEVEMENTS } from '@/hooks/useProgess';

// ─── Palette (matches existing NavBar palette) ────────────────────────────────
const PINK = '#BE185D';
const PINK_LIGHT = 'rgba(249,168,212,0.22)';
const PINK_BORDER = 'rgba(249,168,212,0.40)';
const BG = 'rgba(255,242,248,0.60)';

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
  return (
    <Paper
      elevation={0}
      sx={{
        flex: '1 1 160px',
        minWidth: 140,
        background: BG,
        border: `1px solid ${PINK_BORDER}`,
        borderRadius: 4,
        p: 2.5,
        display: 'flex',
        flexDirection: 'column',
        gap: 0.5,
        transition: 'box-shadow 0.2s',
        '&:hover': { boxShadow: '0 4px 20px rgba(190,24,93,0.12)' },
      }}
    >
      <Box sx={{ color: accent ?? PINK, display: 'flex', alignItems: 'center', gap: 0.75 }}>
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
          color: accent ?? PINK,
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
  const { current, needed } = xpProgressInLevel(totalXp);
  const pct = Math.round((current / needed) * 100);

  return (
    <Paper
      elevation={0}
      sx={{
        background: BG,
        border: `1px solid ${PINK_BORDER}`,
        borderRadius: 4,
        p: 3,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AutoAwesomeIcon sx={{ color: PINK, fontSize: '1.1rem' }} />
          <Typography
            sx={{ fontFamily: '"DM Serif Display", serif', fontSize: '1rem', color: PINK }}
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
          backgroundColor: PINK_LIGHT,
          '& .MuiLinearProgress-bar': {
            borderRadius: 6,
            background: `linear-gradient(90deg, #F9A8D4 0%, ${PINK} 100%)`,
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

// ─── Recent sessions ──────────────────────────────────────────────────────────

function SessionRow({
  correct,
  studied,
  xp,
  date,
  secs,
}: {
  correct: number;
  studied: number;
  xp: number;
  date: string;
  secs: number;
}) {
  const pct = studied > 0 ? Math.round((correct / studied) * 100) : 0;
  const mins = Math.round(secs / 60);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        py: 1.25,
        borderBottom: `1px solid ${PINK_BORDER}`,
        '&:last-child': { borderBottom: 'none' },
      }}
    >
      <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', minWidth: 72 }}>
        {new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
      </Typography>

      <Box sx={{ flex: 1 }}>
        <LinearProgress
          variant="determinate"
          value={pct}
          sx={{
            height: 7,
            borderRadius: 4,
            backgroundColor: PINK_LIGHT,
            '& .MuiLinearProgress-bar': {
              borderRadius: 4,
              backgroundColor: pct === 100 ? '#10B981' : PINK,
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
          bgcolor: PINK_LIGHT,
          color: PINK,
          fontWeight: 700,
          fontSize: '0.68rem',
          height: 22,
          border: `1px solid ${PINK_BORDER}`,
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
  const { progress, achievements, recentSessions, loading } = useProgress();

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
            color: PINK,
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
              sub={`Level ${progress.level}`}
            />
          </>
        ) : null}
      </Box>

      {/* ── Achievements ── */}
      <Paper
        elevation={0}
        sx={{
          background: BG,
          border: `1px solid ${PINK_BORDER}`,
          borderRadius: 4,
          p: 3,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
          <EmojiEventsIcon sx={{ color: PINK, fontSize: '1.1rem' }} />
          <Typography
            sx={{ fontFamily: '"DM Serif Display", serif', fontSize: '1rem', color: PINK }}
          >
            Achievements
          </Typography>
          <Chip
            label={`${unlockedKeys.size} / ${ACHIEVEMENTS.length}`}
            size="small"
            sx={{
              ml: 'auto',
              bgcolor: PINK_LIGHT,
              color: PINK,
              fontWeight: 700,
              fontSize: '0.68rem',
              height: 22,
              border: `1px solid ${PINK_BORDER}`,
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
          background: BG,
          border: `1px solid ${PINK_BORDER}`,
          borderRadius: 4,
          p: 3,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <CalendarTodayIcon sx={{ color: PINK, fontSize: '1rem' }} />
          <Typography
            sx={{ fontFamily: '"DM Serif Display", serif', fontSize: '1rem', color: PINK }}
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
            .filter((s) => s.ended_at)
            .map((s) => (
              <SessionRow
                key={s.id}
                correct={s.cards_correct}
                studied={s.cards_studied}
                xp={s.xp_earned}
                date={s.started_at}
                secs={s.duration_secs}
              />
            ))
        )}
      </Paper>
    </Box>
  );
}