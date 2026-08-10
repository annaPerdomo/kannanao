'use client';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

interface StepSectionProps {
  number: number;
  title: string;
  subtitle: string;
  children: ReactNode;
}

export function StepSection({ number, title, subtitle, children }: StepSectionProps) {
  const theme = useTheme();
  const { brand } = theme.palette;

  return (
    <Box>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start', mb: 1.5 }}>
        <Box
          aria-hidden
          sx={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            bgcolor: brand[600],
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '0.9rem',
            flexShrink: 0,
            mt: 0.25,
          }}
        >
          {number}
        </Box>
        <Box>
          <Typography component="h2" sx={{ fontWeight: 800, fontSize: '1.05rem' }}>
            {title}
          </Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>{subtitle}</Typography>
        </Box>
      </Stack>
      <Box sx={{ pl: { xs: 0, sm: 5.5 } }}>{children}</Box>
    </Box>
  );
}
