'use client';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined';
import SchoolIcon from '@mui/icons-material/School';
import TargetIcon from '@mui/icons-material/TrackChanges';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import { Loading } from '@/components/Loading';
import { PageHeader } from '@/components/PageHeader';
import { AchievementBadge } from '@/components/Stats/AchievementBadge';
import { StatCard } from '@/components/Stats/StatCard';
import type { MemberDetail as MemberDetailData } from '@/hooks/useGroup';
import { ACHIEVEMENTS, xpProgressInLevel } from '@/hooks/useProgress';
import { LAYOUT } from '@/theme';

import { EncouragementForm } from '../EncouragementForm';
import { AssignmentsSection } from './AssignmentsSection';
import { useMemberFormatters } from './helpers';
import { MasteryBreakdown } from './MasteryBreakdown';
import { PracticeModeBreakdown } from './PracticeModeBreakdown';
import { RecentSessionsSection } from './RecentSessionsSection';
import { TrickyWords } from './TrickyWords';

interface MemberDetailProps {
  detail: MemberDetailData;
  loading: boolean;
  onBack: () => void;
  onSendEncouragement?: (memberId: string, message: string, emoji?: string) => Promise<void>;
}

export function MemberDetail({ detail, loading, onBack, onSendEncouragement }: MemberDetailProps) {
  const theme = useTheme();
  const { brand, accent } = theme.palette;
  const t = useTranslations('Group.memberDetail');
  const { formatDate } = useMemberFormatters();

  if (loading) return <Loading message={t('loadingMemberDetails')} />;
  if (!detail) return null;

  const {
    member,
    progress,
    sessions,
    achievements,
    deckProgress,
    practiceModeStats,
    assignments,
    weakWords,
    totalMastery,
    reviewsWaiting,
    reviewsOverdue3d,
  } = detail;
  const { current, needed } = xpProgressInLevel(progress.totalXp);
  const pct = Math.round((current / needed) * 100);
  const accuracy =
    progress.totalCardsStudied > 0
      ? Math.round((progress.totalCorrect / progress.totalCardsStudied) * 100)
      : 0;
  const unlockedKeys = new Set(achievements.map((a) => a.key));

  return (
    <Box>
      {/* Back + Name */}
      <Box sx={{ maxWidth: LAYOUT.headerMaxWidth, mx: 'auto', width: '100%' }}>
        <PageHeader
          compact
          mb={2}
          onBack={onBack}
          title={member.displayName || member.username}
          subtitle={`@${member.username}`}
        />
      </Box>

      {/* Level bar */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 2,
          border: `1.5px solid ${alpha(brand[300], 0.35)}`,
          borderRadius: 3,
          bgcolor: alpha(brand[50], 0.5),
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography sx={{ fontWeight: 800, color: brand[700] }}>
            {t('level', { level: progress.level })}
          </Typography>
          <Typography sx={{ fontSize: '0.8rem', color: brand[600], fontWeight: 600 }}>
            {t('totalXp', { totalXp: progress.totalXp })}
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={pct}
          sx={{
            height: 10,
            borderRadius: 5,
            bgcolor: alpha(brand[200], 0.5),
            '& .MuiLinearProgress-bar': {
              borderRadius: 5,
              background: `linear-gradient(90deg, ${brand[400]}, ${accent[400]})`,
            },
          }}
        />
        <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', mt: 0.5 }}>
          {t('xpToNextLevel', { current, needed, nextLevel: progress.level + 1 })}
        </Typography>
      </Paper>

      {/* Stat cards */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <StatCard
          icon={<SchoolIcon sx={{ fontSize: 18 }} />}
          label={t('cardsStudiedLabel')}
          value={progress.totalCardsStudied.toLocaleString()}
        />
        <StatCard
          icon={<TargetIcon sx={{ fontSize: 18 }} />}
          label={t('accuracyLabel')}
          value={`${accuracy}%`}
        />
        <StatCard
          icon={<LocalFireDepartmentIcon sx={{ fontSize: 18 }} />}
          label={t('streakLabel')}
          value={`${progress.streakDays}d`}
        />
        <StatCard
          icon={<EmojiEventsIcon sx={{ fontSize: 18 }} />}
          label={t('sessionsLabel')}
          value={progress.totalSessions}
        />
        {/* Hidden, not zeroed: a "0" from a query that never ran reads as "caught up". */}
        {reviewsWaiting !== null && (
          <StatCard
            icon={<ScheduleOutlinedIcon sx={{ fontSize: 18 }} />}
            label={t('reviewsWaitingLabel')}
            value={reviewsWaiting.toLocaleString()}
            sub={reviewsOverdue3d ? t('reviewsOverdueSub', { count: reviewsOverdue3d }) : undefined}
          />
        )}
      </Box>

      {/* Practice Mode Breakdown */}
      <PracticeModeBreakdown stats={practiceModeStats} />

      <MasteryBreakdown mastery={totalMastery} />

      {/* Tricky words — the member's most-missed cards */}
      <TrickyWords weakWords={weakWords ?? []} />

      {/* Deck Progress */}
      {deckProgress.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: '0.85rem',
              color: brand[700],
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              mb: 1.5,
            }}
          >
            {t('deckProgress')}
          </Typography>
          <Grid container spacing={1.5}>
            {deckProgress.map((dp) => (
              <Grid size={{ xs: 12, sm: 6 }} key={dp.deckId}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 1.5,
                    border: `1px solid ${alpha(brand[300], 0.3)}`,
                    borderRadius: 2.5,
                    bgcolor: alpha(brand[50], 0.4),
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                    <Typography sx={{ fontSize: '1.1rem' }}>{dp.deckEmoji || '📚'}</Typography>
                    <Typography
                      sx={{ fontWeight: 700, fontSize: '0.82rem', color: brand[800] }}
                      noWrap
                    >
                      {dp.deckName}
                    </Typography>
                  </Box>
                  <Box
                    sx={{ display: 'flex', gap: 2, fontSize: '0.7rem', color: 'text.secondary' }}
                  >
                    <span>{t('cardsStudiedCount', { count: dp.cardsStudied })}</span>
                    <span>{t('accuracyPercent', { accuracy: dp.accuracy })}</span>
                    <span>{formatDate(dp.lastStudied)}</span>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      gap: 1.25,
                      mt: 0.5,
                      fontSize: '0.68rem',
                      fontWeight: 600,
                    }}
                  >
                    <Box component="span" sx={{ color: theme.palette.grey[600] }}>
                      {t('masteryNewCount', { count: dp.mastery.new })}
                    </Box>
                    <Box component="span" sx={{ color: theme.palette.warning.dark }}>
                      {t('masteryLearningCount', { count: dp.mastery.learning })}
                    </Box>
                    <Box component="span" sx={{ color: theme.palette.success.dark }}>
                      {t('masteryStrongCount', { count: dp.mastery.strong })}
                    </Box>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {assignments.total > 0 && <AssignmentsSection assignments={assignments} />}

      {sessions.length > 0 && (
        <RecentSessionsSection memberId={member.id} initialSessions={sessions} />
      )}

      {/* Encouragement */}
      {onSendEncouragement && (
        <Box sx={{ mb: 3 }}>
          <EncouragementForm
            memberId={member.id}
            memberName={member.displayName || member.username}
            onSend={onSendEncouragement}
          />
        </Box>
      )}

      {/* Achievements */}
      <Box>
        <Typography
          sx={{
            fontWeight: 800,
            fontSize: '0.85rem',
            color: brand[700],
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            mb: 1.5,
          }}
        >
          {t('achievements')}
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {ACHIEVEMENTS.map((ach) => (
            <AchievementBadge
              key={ach.key}
              achievementKey={ach.key}
              unlocked={unlockedKeys.has(ach.key)}
              unlockedAt={achievements.find((a) => a.key === ach.key)?.unlockedAt}
            />
          ))}
        </Box>
      </Box>
    </Box>
  );
}
