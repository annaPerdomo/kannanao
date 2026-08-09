'use client';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { toHoursMinutes } from '@/components/Group/activityWeek';
import type { GroupMember } from '@/hooks/useGroup';
import type { GroupActivity } from '@/hooks/useGroupActivity';

import { computeWeekStats } from './computeWeekStats';
import { StatPill } from './StatPill';

interface WeekStatStripProps {
  members: GroupMember[];
  activity: GroupActivity | null;
}

const pillText = { fontSize: '0.8rem', fontWeight: 700, color: 'text.primary' } as const;

/** Compact "This week" summary shown between the needs-attention panel and the tabs. */
export function WeekStatStrip({ members, activity }: WeekStatStripProps) {
  const theme = useTheme();
  const { brand } = theme.palette;
  const t = useTranslations('Group.weekStatStrip');

  const stats = useMemo(() => computeWeekStats(members, activity), [members, activity]);
  const { hours, minutes } = toHoursMinutes(stats.studySecs);

  return (
    <Paper
      elevation={0}
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'stretch', sm: 'center' },
        gap: { xs: 1, sm: 1.5 },
        p: { xs: 1.5, sm: 2 },
        mb: { xs: 2.5, sm: 3 },
        borderRadius: theme.radii.lg,
        border: `1px solid ${alpha(brand[300], 0.4)}`,
        bgcolor: 'background.paper',
      }}
    >
      <Typography
        sx={{
          fontSize: '0.72rem',
          fontWeight: 800,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: brand[700],
          flexShrink: 0,
        }}
      >
        {t('heading')}
      </Typography>

      <Box
        sx={{
          display: { xs: 'grid', sm: 'flex' },
          gridTemplateColumns: { xs: '1fr 1fr' },
          flexWrap: { sm: 'wrap' },
          gap: 1,
          flex: 1,
          minWidth: 0,
        }}
      >
        <StatPill>
          <Typography sx={pillText}>{t('learners', { count: stats.learnerCount })}</Typography>
        </StatPill>

        <StatPill>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: 'success.main',
              flexShrink: 0,
            }}
          />
          <Typography sx={pillText}>{t('active', { count: stats.activeCount })}</Typography>
        </StatPill>

        <StatPill>
          <Typography sx={pillText}>{t('cards', { count: stats.cardsThisWeek })}</Typography>
        </StatPill>

        <StatPill>
          <Typography sx={pillText}>{t('accuracy', { pct: stats.accuracyPct ?? '—' })}</Typography>
          {stats.accuracyDeltaPct !== null && stats.accuracyDeltaPct !== 0 && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.25,
                color: stats.accuracyDeltaPct > 0 ? 'success.main' : 'error.main',
              }}
              aria-label={
                stats.accuracyDeltaPct > 0
                  ? t('accuracyTrendAriaUp', { pct: Math.abs(stats.accuracyDeltaPct) })
                  : t('accuracyTrendAriaDown', { pct: Math.abs(stats.accuracyDeltaPct) })
              }
            >
              {stats.accuracyDeltaPct > 0 ? (
                <ArrowUpwardIcon aria-hidden sx={{ fontSize: 12 }} />
              ) : (
                <ArrowDownwardIcon aria-hidden sx={{ fontSize: 12 }} />
              )}
              <Typography sx={{ fontSize: '0.72rem', fontWeight: 700 }}>
                {Math.abs(stats.accuracyDeltaPct)}%
              </Typography>
            </Box>
          )}
        </StatPill>

        <StatPill>
          <Typography sx={pillText}>
            {t('studied', { time: t('duration', { h: hours, m: minutes }) })}
          </Typography>
        </StatPill>

        <StatPill>
          <Typography sx={pillText}>
            {stats.bestStreak
              ? t('bestStreak', { name: stats.bestStreak.name, days: stats.bestStreak.days })
              : t('bestStreakEmpty')}
          </Typography>
        </StatPill>

        <StatPill>
          <Typography sx={pillText}>{t('mastered', { count: stats.masteredCount })}</Typography>
        </StatPill>

        <StatPill>
          <Typography sx={pillText}>
            {t('groupXp', { xp: stats.groupXp.toLocaleString() })}
          </Typography>
        </StatPill>
      </Box>
    </Paper>
  );
}
