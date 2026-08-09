'use client';
import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';

interface StatPillProps {
  children: React.ReactNode;
}

export function StatPill({ children }: StatPillProps) {
  const theme = useTheme();
  const { brand } = theme.palette;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        px: 1.5,
        py: 0.75,
        borderRadius: theme.radii.pill,
        border: `1px solid ${alpha(brand[300], 0.4)}`,
        bgcolor: alpha(brand[50], 0.7),
        minWidth: 0,
      }}
    >
      {children}
    </Box>
  );
}
