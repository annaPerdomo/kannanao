'use client';

import {
  Box,
  Typography,
  Chip,
  Skeleton,
  Paper,
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SchoolIcon from '@mui/icons-material/School';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { useProgress, ACHIEVEMENTS } from '@/hooks/useProgress';
import { StatCard } from '@/components/Stats/StatCard';
import { LevelBar } from '@/components/Stats/LevelBar';
import { AchievementBadge } from '@/components/Stats/AchievementBadge';
import { StudyCalendar } from '@/components/Stats/StudyCalendar';
import { PeriodSummary } from '@/components/Stats/PeriodSummary';
import { SessionRow } from '@/components/Stats/SessionRow';

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

      {loading ? (
        <Skeleton variant="rounded" height={96} sx={{ borderRadius: 4 }} />
      ) : progress ? (
        <LevelBar totalXp={progress.total_xp} level={progress.level} />
      ) : null}

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={110} sx={{ flex: '1 1 160px', borderRadius: 4 }} />
          ))
        ) : progress ? (
          <>
            <StatCard icon={<LocalFireDepartmentIcon sx={{ fontSize: '1.1rem' }} />} label="Day Streak" value={progress.streak_days} sub={`Best: ${progress.longest_streak} days`} accent="#EF4444" />
            <StatCard icon={<SchoolIcon sx={{ fontSize: '1.1rem' }} />} label="Cards Studied" value={progress.total_cards_studied.toLocaleString()} sub={`${progress.total_sessions} sessions`} />
            <StatCard icon={<EmojiEventsIcon sx={{ fontSize: '1.1rem' }} />} label="Accuracy" value={`${accuracy}%`} sub={`${progress.total_correct} correct`} accent="#F59E0B" />
            <StatCard icon={<AutoAwesomeIcon sx={{ fontSize: '1.1rem' }} />} label="Total XP" value={progress.total_xp.toLocaleString()} sub={`${spendableXp.toLocaleString()} spendable · Level ${progress.level}`} />
          </>
        ) : null}
      </Box>

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
          <Typography sx={{ fontFamily: '"DM Serif Display", serif', fontSize: '1rem', color: brand[700] }}>
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

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
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
          <Typography sx={{ fontFamily: '"DM Serif Display", serif', fontSize: '1rem', color: brand[700] }}>
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
          <Typography sx={{ fontFamily: '"DM Serif Display", serif', fontSize: '1rem', color: brand[700] }}>
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
