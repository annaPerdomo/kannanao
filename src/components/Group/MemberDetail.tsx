'use client';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { Loading } from '@/components/Loading';
import { AchievementBadge } from '@/components/Stats/AchievementBadge';
import { StatCard } from '@/components/Stats/StatCard';
import { ACHIEVEMENTS, xpProgressInLevel } from '@/hooks/useProgress';
import type { MemberDetail as MemberDetailData } from '@/hooks/useGroup';

import { EncouragementForm } from './EncouragementForm';

import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import SchoolIcon from '@mui/icons-material/School';
import TargetIcon from '@mui/icons-material/TrackChanges';

function formatDuration(secs: number | null): string {
  if (!secs) return '--';
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  return `${mins}m`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

interface MemberDetailProps {
  detail: MemberDetailData;
  loading: boolean;
  onBack: () => void;
  onSendEncouragement?: (memberId: string, message: string, emoji?: string) => Promise<void>;
}

export function MemberDetail({ detail, loading, onBack, onSendEncouragement }: MemberDetailProps) {
  const theme = useTheme();
  const { brand, accent } = theme.palette;

  if (loading) return <Loading message="Loading member details..." />;
  if (!detail) return null;

  const { member, progress, sessions, achievements, deckProgress } = detail;
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
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={onBack}
          sx={{ textTransform: 'none', fontWeight: 700, color: brand[700] }}
        >
          Back
        </Button>
        <Typography sx={{ fontWeight: 800, fontSize: '1.2rem', color: brand[800] }}>
          {member.displayName || member.username}
        </Typography>
        <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
          @{member.username}
        </Typography>
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
            Level {progress.level}
          </Typography>
          <Typography sx={{ fontSize: '0.8rem', color: brand[600], fontWeight: 600 }}>
            {progress.totalXp.toLocaleString()} total XP
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
          {current}/{needed} XP to level {progress.level + 1}
        </Typography>
      </Paper>

      {/* Stat cards */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <StatCard
          icon={<SchoolIcon sx={{ fontSize: 18 }} />}
          label="Cards Studied"
          value={progress.totalCardsStudied.toLocaleString()}
        />
        <StatCard
          icon={<TargetIcon sx={{ fontSize: 18 }} />}
          label="Accuracy"
          value={`${accuracy}%`}
        />
        <StatCard
          icon={<LocalFireDepartmentIcon sx={{ fontSize: 18 }} />}
          label="Streak"
          value={`${progress.streakDays}d`}
        />
        <StatCard
          icon={<EmojiEventsIcon sx={{ fontSize: 18 }} />}
          label="Sessions"
          value={progress.totalSessions}
        />
      </Box>

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
            Deck Progress
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
                    <span>{dp.cardsStudied} studied</span>
                    <span>{dp.accuracy}% accuracy</span>
                    <span>{formatDate(dp.lastStudied)}</span>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Recent Sessions */}
      {sessions.length > 0 && (
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
            Recent Sessions
          </Typography>
          {sessions.slice(0, 10).map((s) => (
            <Paper
              key={s.id}
              elevation={0}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 1.25,
                mb: 0.75,
                border: `1px solid ${alpha(brand[300], 0.25)}`,
                borderRadius: 2,
                bgcolor: alpha(brand[50], 0.3),
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: brand[700] }}>
                  {s.practiceMode || 'study'}
                </Typography>
                <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                  {s.cardsStudied} cards · {s.cardsCorrect}/{s.cardsStudied} correct
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography sx={{ fontSize: '0.7rem', color: accent[600], fontWeight: 600 }}>
                  +{s.xpEarned} XP
                </Typography>
                <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
                  {formatDuration(s.durationSecs)} · {formatDate(s.startedAt)}
                </Typography>
              </Box>
            </Paper>
          ))}
        </Box>
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
          Achievements
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
