'use client';

import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { alpha, Box, Button, Container, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { Loading } from '@/components/Loading';
import { useAuth } from '@/contexts/AuthContext';

interface RequireAuthProps {
  children: ReactNode;
  feature: string;
}

export function RequireAuth({ children, feature }: RequireAuthProps) {
  const t = useTranslations('Travel.requireAuth');
  const { user, loading } = useAuth();
  const router = useRouter();
  const theme = useTheme();
  const { brand } = theme.palette;

  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Loading message={t('checkingAccount')} />
      </Container>
    );
  }

  if (!user) {
    return (
      <Container maxWidth="sm" sx={{ py: { xs: 6, sm: 10 } }}>
        <Stack spacing={3} alignItems="center" textAlign="center">
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: (theme) => theme.radii.lg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: alpha(brand[100], 0.6),
              border: `1px solid ${alpha(brand[200], 0.4)}`,
            }}
          >
            <LockOutlinedIcon sx={{ fontSize: 28, color: brand[600] }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ color: 'text.primary', mb: 0.5 }}>
              {t('signInToAccess', { feature })}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 320, mx: 'auto' }}>
              {t('accountRequired')}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1.5}>
            <Button
              variant="contained"
              onClick={() => router.push('/login')}
              sx={{
                bgcolor: brand[700],
                color: '#fff',
                textTransform: 'none',
                borderRadius: (theme) => theme.radii.md,
                px: 3,
                '&:hover': { bgcolor: brand[800] },
              }}
            >
              {t('signIn')}
            </Button>
            <Button
              variant="outlined"
              onClick={() => router.push('/travel')}
              sx={{
                textTransform: 'none',
                borderRadius: (theme) => theme.radii.md,
                borderColor: alpha(brand[400], 0.5),
                color: brand[700],
              }}
            >
              {t('backToTravel')}
            </Button>
          </Stack>
        </Stack>
      </Container>
    );
  }

  return <>{children}</>;
}
