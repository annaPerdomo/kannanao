'use client';

import { Box, Card, CardContent } from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { ReactNode } from 'react';

import { APP_NAME } from '@/lib/brand';

interface JoinCardProps {
  children: ReactNode;
}

/** Shared chrome for every state of the join page. */
export function JoinCard({ children }: JoinCardProps) {
  return (
    <Box
      sx={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
      }}
    >
      <Card
        sx={(theme) => ({
          maxWidth: 420,
          width: '100%',
          borderRadius: 4,
          border: `1px solid ${alpha(theme.palette.brand[300], 0.35)}`,
          boxShadow: `0 8px 40px ${alpha(theme.palette.brand[700], 0.1)}`,
          bgcolor: theme.palette.surfaces.overlay,
          backdropFilter: 'blur(14px)',
        })}
      >
        <CardContent sx={{ p: 4 }}>
          <Box
            component="img"
            src="/brand/logo-lockup.png"
            alt={APP_NAME}
            sx={{ display: 'block', height: 44, width: 'auto', mx: 'auto', mb: 1 }}
          />
          {children}
        </CardContent>
      </Card>
    </Box>
  );
}
