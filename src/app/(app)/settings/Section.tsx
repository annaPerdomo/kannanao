'use client';

import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

interface SectionProps {
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
}

export function Section({ icon, title, description, children }: SectionProps) {
  const theme = useTheme();
  const { brand, surfaces } = theme.palette;
  return (
    <Paper
      sx={{
        p: 3,
        borderRadius: 4,
        border: `1px solid ${alpha(brand[200], 0.4)}`,
        bgcolor: surfaces.glass,
      }}
    >
      <Stack direction="row" alignItems="center" gap={1.5} sx={{ mb: 0.5 }}>
        <Box sx={{ color: brand[500], display: 'flex' }}>{icon}</Box>
        <Typography
          sx={{
            fontFamily: (t) => t.fonts.cute,
            fontWeight: 600,
            fontSize: '1.05rem',
            color: brand[700],
          }}
        >
          {title}
        </Typography>
      </Stack>
      <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary', mb: 2 }}>
        {description}
      </Typography>
      {children}
    </Paper>
  );
}
