'use client';
import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { UserAvatar } from '@/components/UserAvatar';
import type { LeaderboardEntry } from '@/hooks/useGroupLeaderboard';
import { amber, honey, neutral } from '@/theme';

import { ShowMoreButton } from './ShowMoreButton';

/** Gold / silver / bronze, from the theme scales so dark mode tints them too. */
const PODIUM = [amber[400], neutral[300], honey[400]];

interface LeaderboardWidgetProps {
  entries: LeaderboardEntry[];
  compact?: boolean;
  maxVisible?: number;
}

export function LeaderboardWidget({ entries, compact, maxVisible }: LeaderboardWidgetProps) {
  const theme = useTheme();
  const { brand } = theme.palette;
  const t = useTranslations('Group.leaderboard');
  const [expanded, setExpanded] = useState(false);

  if (entries.length === 0) {
    return (
      <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>{t('empty')}</Typography>
    );
  }

  const capped = maxVisible !== undefined && !expanded ? entries.slice(0, maxVisible) : entries;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      {capped.map((entry, i) => (
        <Box
          key={entry.id}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.25,
            px: 1,
            py: compact ? 0.75 : 1,
            borderRadius: theme.radii.md,
            bgcolor: i === 0 ? alpha(brand[100], 0.55) : 'transparent',
          }}
        >
          <Box
            sx={{
              width: 26,
              height: 26,
              flexShrink: 0,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.78rem',
              fontWeight: 800,
              color: 'text.primary',
              bgcolor: i < 3 ? alpha(PODIUM[i], 0.55) : alpha(brand[200], 0.4),
              border: `1.5px solid ${i < 3 ? PODIUM[i] : alpha(brand[300], 0.5)}`,
            }}
          >
            {i + 1}
          </Box>
          <UserAvatar
            avatar={entry.avatar}
            name={entry.displayName || entry.username}
            size={compact ? 30 : 34}
          />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: compact ? '0.85rem' : '0.92rem',
                color: 'text.primary',
              }}
              noWrap
            >
              {entry.displayName || entry.username}
            </Typography>
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }} noWrap>
              @{entry.username}
              {!compact && entry.streakDays > 0 ? ` · 🔥 ${entry.streakDays}d` : ''}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
            <Typography sx={{ fontWeight: 800, fontSize: '0.88rem', color: brand[700] }}>
              {t('xpAmount', { xp: entry.weeklyXp.toLocaleString() })}
            </Typography>
            {!compact && (
              <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
                {t('cardsCount', { count: entry.weeklyCards })}
              </Typography>
            )}
          </Box>
        </Box>
      ))}

      {maxVisible !== undefined && entries.length > maxVisible && (
        <ShowMoreButton
          expanded={expanded}
          total={entries.length}
          onClick={() => setExpanded((v) => !v)}
        />
      )}
    </Box>
  );
}
