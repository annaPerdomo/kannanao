'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import LinearProgress from '@mui/material/LinearProgress';
import { useTheme, alpha } from '@mui/material/styles';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { xpProgressInLevel } from '@/hooks/useProgress';

export function LevelBar({ totalXp, level }: { totalXp: number; level: number }) {
  const theme = useTheme();
  const { brand } = theme.palette;
  const { current, needed } = xpProgressInLevel(totalXp);
  const pct = Math.round((current / needed) * 100);

  return (
    <Paper
      elevation={0}
      sx={{
        background: alpha(brand[50], 0.6),
        border: `1px solid ${alpha(brand[300], 0.40)}`,
        borderRadius: 4,
        p: 3,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AutoAwesomeIcon sx={{ color: brand[700], fontSize: '1.1rem' }} />
          <Typography
            sx={{ fontFamily: '"DM Serif Display", serif', fontSize: '1rem', color: brand[700] }}
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
          backgroundColor: alpha(brand[300], 0.22),
          '& .MuiLinearProgress-bar': {
            borderRadius: 6,
            background: `linear-gradient(90deg, ${brand[300]} 0%, ${brand[700]} 100%)`,
          },
        }}
      />

      <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', textAlign: 'right' }}>
        {pct}% to Level {level + 1} ✨
      </Typography>
    </Paper>
  );
}
