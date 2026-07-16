'use client';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import { modeColor, modeLabel } from '@/components/Stats/constants';
import type { MemberDetail } from '@/hooks/useGroup';
import type { SessionMode } from '@/hooks/useProgress';

import { formatDuration } from './helpers';

type PracticeModeStat = MemberDetail['practiceModeStats'][number];

interface PracticeModeBreakdownProps {
  stats: PracticeModeStat[];
}

function ModeCard({
  s,
  maxSessions,
  t,
}: {
  s: PracticeModeStat;
  maxSessions: number;
  t: ReturnType<typeof useTranslations>;
}) {
  const color = modeColor(s.mode as SessionMode);
  const isSpeech = s.source === 'speech';
  const unitLabel = isSpeech ? t('linesUnit') : t('cardsUnit');

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        border: `1px solid ${alpha(color, 0.25)}`,
        borderRadius: 3,
        bgcolor: alpha(color, 0.06),
        transition: 'box-shadow 0.2s',
        '&:hover': { boxShadow: `0 4px 20px ${alpha(color, 0.15)}` },
      }}
    >
      {/* Header: mode name + session count */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 1.25,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              bgcolor: color,
              flexShrink: 0,
            }}
          />
          <Typography sx={{ fontWeight: 700, fontSize: '0.88rem', color: 'text.primary' }}>
            {modeLabel(s.mode as SessionMode)}
          </Typography>
        </Box>
        <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color }}>
          {t('sessionsCount', { count: s.sessions })}
        </Typography>
      </Box>

      {/* Activity bar */}
      <LinearProgress
        variant="determinate"
        value={maxSessions > 0 ? (s.sessions / maxSessions) * 100 : 0}
        sx={{
          height: 6,
          borderRadius: 3,
          bgcolor: alpha(color, 0.12),
          mb: 1.25,
          '& .MuiLinearProgress-bar': { borderRadius: 3, bgcolor: color },
        }}
      />

      {/* Stats row */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '0.72rem',
          color: 'text.secondary',
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: 'text.primary' }}>
            {s.cardsStudied}
          </Typography>
          <Typography sx={{ fontSize: '0.62rem', color: 'text.secondary' }}>{unitLabel}</Typography>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: 'text.primary' }}>
            {s.accuracy}%
          </Typography>
          <Typography sx={{ fontSize: '0.62rem', color: 'text.secondary' }}>
            {t('accuracyLabel')}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color }}>{s.xpEarned}</Typography>
          <Typography sx={{ fontSize: '0.62rem', color: 'text.secondary' }}>
            {t('xpLabel')}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: 'text.primary' }}>
            {formatDuration(s.totalDurationSecs)}
          </Typography>
          <Typography sx={{ fontSize: '0.62rem', color: 'text.secondary' }}>
            {t('timeLabel')}
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
}

const SOURCE_CONFIG = {
  deck: { labelKey: 'deckPractice', icon: <MenuBookIcon sx={{ fontSize: 14 }} /> },
  speech: { labelKey: 'speechPractice', icon: <RecordVoiceOverIcon sx={{ fontSize: 14 }} /> },
} as const;

export function PracticeModeBreakdown({ stats }: PracticeModeBreakdownProps) {
  const { brand } = useTheme().palette;
  const t = useTranslations('Group.practiceBreakdown');

  if (stats.length === 0) return null;

  const maxSessions = Math.max(...stats.map((s) => s.sessions));
  const deckStats = stats.filter((s) => s.source === 'deck');
  const speechStats = stats.filter((s) => s.source === 'speech');
  const groups = [
    { key: 'deck' as const, items: deckStats },
    { key: 'speech' as const, items: speechStats },
  ].filter((g) => g.items.length > 0);

  return (
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
        {t('heading')}
      </Typography>

      {groups.map((group) => {
        const cfg = SOURCE_CONFIG[group.key];
        return (
          <Box key={group.key} sx={{ mb: groups.length > 1 ? 2 : 0 }}>
            {/* Source header — only show if both groups exist */}
            {groups.length > 1 && (
              <Chip
                icon={cfg.icon}
                label={t(cfg.labelKey)}
                size="small"
                sx={{
                  mb: 1.25,
                  height: 24,
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  bgcolor: alpha(brand[100], 0.6),
                  color: brand[700],
                  '& .MuiChip-icon': { color: brand[600] },
                  '& .MuiChip-label': { px: 1 },
                }}
              />
            )}
            <Grid container spacing={1.5}>
              {group.items.map((s) => (
                <Grid size={{ xs: 12, sm: 6 }} key={`${s.source}:${s.mode}`}>
                  <ModeCard s={s} maxSessions={maxSessions} t={t} />
                </Grid>
              ))}
            </Grid>
          </Box>
        );
      })}
    </Box>
  );
}
