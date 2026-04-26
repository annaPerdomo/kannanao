'use client';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import type { LeaderboardEntry } from '@/hooks/useGroupLeaderboard';

const MEDALS = ['🥇', '🥈', '🥉'];

interface LeaderboardWidgetProps {
  entries: LeaderboardEntry[];
  compact?: boolean;
}

export function LeaderboardWidget({ entries, compact }: LeaderboardWidgetProps) {
  const theme = useTheme();
  const { brand } = theme.palette;

  if (entries.length === 0) {
    return (
      <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', fontStyle: 'italic' }}>
        No activity this week yet.
      </Typography>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
      {entries.map((entry, i) => (
        <Paper
          key={entry.id}
          elevation={0}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            p: compact ? 1 : 1.25,
            border: `1px solid ${alpha(brand[300], i === 0 ? 0.5 : 0.25)}`,
            borderRadius: 2,
            bgcolor: i === 0 ? alpha(brand[100], 0.5) : alpha(brand[50], 0.3),
            transition: 'all 0.15s ease',
          }}
        >
          <Typography sx={{ fontSize: compact ? '1rem' : '1.2rem', width: 28, textAlign: 'center' }}>
            {i < 3 ? MEDALS[i] : `${i + 1}.`}
          </Typography>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              sx={{ fontWeight: 700, fontSize: compact ? '0.78rem' : '0.85rem', color: brand[800] }}
              noWrap
            >
              {entry.displayName || entry.username}
            </Typography>
            {!compact && (
              <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
                Lv.{entry.level}
                {entry.streakDays > 0 ? ` · 🔥 ${entry.streakDays}d` : ''}
              </Typography>
            )}
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography sx={{ fontWeight: 800, fontSize: compact ? '0.78rem' : '0.85rem', color: brand[700] }}>
              {entry.weeklyXp.toLocaleString()} XP
            </Typography>
            {!compact && (
              <Typography sx={{ fontSize: '0.63rem', color: 'text.secondary' }}>
                {entry.weeklyCards} cards
              </Typography>
            )}
          </Box>
        </Paper>
      ))}
    </Box>
  );
}
