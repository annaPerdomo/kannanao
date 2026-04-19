'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import { useTheme, alpha } from '@mui/material/styles';
import { FONT_DISPLAY } from '@/theme';

export function StatCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: string;
  accent?: string;
}) {
  const theme = useTheme();
  const { brand } = theme.palette;
  const color = accent ?? brand[700];

  return (
    <Paper
      elevation={0}
      sx={{
        flex: '1 1 160px',
        minWidth: 140,
        background: alpha(brand[50], 0.6),
        border: `1px solid ${alpha(brand[300], 0.40)}`,
        borderRadius: 4,
        p: 2.5,
        display: 'flex',
        flexDirection: 'column',
        gap: 0.5,
        transition: 'box-shadow 0.2s',
        '&:hover': { boxShadow: `0 4px 20px ${alpha(brand[700], 0.12)}` },
      }}
    >
      <Box sx={{ color, display: 'flex', alignItems: 'center', gap: 0.75 }}>
        {icon}
        <Typography
          sx={{
            fontFamily: FONT_DISPLAY,
            fontSize: '0.78rem',
            color: 'text.secondary',
            letterSpacing: '0.02em',
          }}
        >
          {label}
        </Typography>
      </Box>
      <Typography
        sx={{
          fontFamily: FONT_DISPLAY,
          fontSize: '2rem',
          color,
          lineHeight: 1.1,
          fontWeight: 400,
        }}
      >
        {value}
      </Typography>
      {sub && (
        <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>{sub}</Typography>
      )}
    </Paper>
  );
}
