'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import { useTheme, alpha } from '@mui/material/styles';
import type { SessionMode } from '@/hooks/useProgress';
import { modeLabel, modeColor } from './constants';

export function SessionRow({
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
