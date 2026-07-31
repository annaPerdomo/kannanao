'use client';

import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import InsightsIcon from '@mui/icons-material/Insights';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import SchoolIcon from '@mui/icons-material/School';
import { Box, Chip, Paper, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

import { LoadingOverlay } from '@/components/Loading';
import { PageHeader } from '@/components/PageHeader';
import { AchievementBadge } from '@/components/Stats/AchievementBadge';
import { LevelBar } from '@/components/Stats/LevelBar';
import { PeriodSummary } from '@/components/Stats/PeriodSummary';
import { SessionRow } from '@/components/Stats/SessionRow';
import { StatCard } from '@/components/Stats/StatCard';
import { StatsSkeleton } from '@/components/Stats/StatsSkeleton';
import { StudyCalendar } from '@/components/Stats/StudyCalendar';
import { useProgressCtx } from '@/contexts/ProgressContext';
import { ACHIEVEMENTS } from '@/hooks/useProgress';
import { LAYOUT } from '@/theme';

export default function Stats() {
  const router = useRouter();
  const t = useTranslations('Stats');
  const tCommon = useTranslations('Common');
  const theme = useTheme();
  const { brand } = theme.palette;
  const {
    progress,
    spendableXp,
    achievements,
    recentSessions,
    loading,
    refetch: refetchProgress,
  } = useProgressCtx();

  // ProgressContext lives in AppShell and only fetches once per hard load, so a
  // session finished since then would be missing from these stats entirely.
  useEffect(() => {
    void refetchProgress();
  }, [refetchProgress]);

  const accuracy =
    progress && progress.total_cards_studied > 0
      ? Math.round((progress.total_correct / progress.total_cards_studied) * 100)
      : 0;

  const unlockedKeys = new Set(achievements.map((a) => a.achievement_key));

  return (
    <Box
      sx={{
        maxWidth: LAYOUT.narrowMaxWidth,
        mx: 'auto',
        px: LAYOUT.pagePx,
        py: 4,
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
      }}
    >
      <PageHeader
        icon={<InsightsIcon />}
        title={t('pageHeader.title')}
        subtitle={t('pageHeader.subtitle')}
        onBack={() => router.push('/')}
        mb={3}
      />

      {loading ? (
        <LoadingOverlay message={tCommon('loading')}>
          <StatsSkeleton />
        </LoadingOverlay>
      ) : (
        <>
          {progress ? <LevelBar totalXp={progress.total_xp} level={progress.level} /> : null}

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {progress ? (
              <>
                <StatCard
                  icon={<LocalFireDepartmentIcon sx={{ fontSize: '1.1rem' }} />}
                  label={t('statCards.dayStreak')}
                  value={progress.streak_days}
                  sub={t('statCards.dayStreakSub', { days: progress.longest_streak })}
                  accent="#EF4444"
                />
                <StatCard
                  icon={<SchoolIcon sx={{ fontSize: '1.1rem' }} />}
                  label={t('statCards.cardsStudied')}
                  value={progress.total_cards_studied.toLocaleString()}
                  sub={t('statCards.cardsStudiedSub', { count: progress.total_sessions })}
                />
                <StatCard
                  icon={<EmojiEventsIcon sx={{ fontSize: '1.1rem' }} />}
                  label={t('statCards.accuracy')}
                  value={`${accuracy}%`}
                  sub={t('statCards.accuracySub', { count: progress.total_correct })}
                  accent="#F59E0B"
                />
                <StatCard
                  icon={<AutoAwesomeIcon sx={{ fontSize: '1.1rem' }} />}
                  label={t('statCards.totalXp')}
                  value={progress.total_xp.toLocaleString()}
                  sub={t('statCards.totalXpSub', {
                    spendable: spendableXp.toLocaleString(),
                    level: progress.level,
                  })}
                />
              </>
            ) : null}
          </Box>

          <Paper
            elevation={0}
            sx={{
              background: alpha(brand[50], 0.6),
              border: `1px solid ${alpha(brand[300], 0.4)}`,
              borderRadius: 4,
              p: 3,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
              <EmojiEventsIcon sx={{ color: brand[700], fontSize: '1.1rem' }} />
              <Typography
                sx={{
                  fontFamily: (t) => t.fonts.cute,
                  fontWeight: 600,
                  fontSize: '1rem',
                  color: brand[700],
                }}
              >
                {t('achievements.heading')}
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
                  border: `1px solid ${alpha(brand[300], 0.4)}`,
                }}
              />
            </Box>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {ACHIEVEMENTS.map((def) => {
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
              border: `1px solid ${alpha(brand[300], 0.4)}`,
              borderRadius: 4,
              p: 3,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <CalendarTodayIcon sx={{ color: brand[700], fontSize: '1rem' }} />
              <Typography
                sx={{
                  fontFamily: (t) => t.fonts.cute,
                  fontWeight: 600,
                  fontSize: '1rem',
                  color: brand[700],
                }}
              >
                {t('recentSessions.heading')}
              </Typography>
            </Box>

            {recentSessions.length === 0 ? (
              <Typography
                sx={{ fontSize: '0.88rem', color: 'text.secondary', py: 2, textAlign: 'center' }}
              >
                {t('recentSessions.empty')}
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
              border: `1px solid ${alpha(brand[300], 0.4)}`,
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
                sx={{
                  fontFamily: (t) => t.fonts.cute,
                  fontWeight: 600,
                  fontSize: '1rem',
                  color: brand[700],
                }}
              >
                {t('studyActivity.heading')}
              </Typography>
            </Box>

            <PeriodSummary sessions={recentSessions} />
            <StudyCalendar sessions={recentSessions} />
          </Paper>
        </>
      )}
    </Box>
  );
}
