'use client';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import type { DataError, DataErrorKind } from '@/lib/dataError';

interface DataErrorStateProps {
  error: DataError | null;
  onRetry?: () => void;
  dense?: boolean;
}

const COPY: Record<DataErrorKind, { icon: string; title: string; body: string }> = {
  offline: { icon: '📡', title: 'offlineTitle', body: 'offlineBody' },
  upstream: { icon: '🛠️', title: 'upstreamTitle', body: 'upstreamBody' },
  auth: { icon: '🔑', title: 'authTitle', body: 'authBody' },
  notFound: { icon: '🔍', title: 'genericTitle', body: 'genericBody' },
  unknown: { icon: '🌧️', title: 'genericTitle', body: 'genericBody' },
};

/** Must stay visibly distinct from the you-have-nothing-yet empty state. */
export function DataErrorState({ error, onRetry, dense = false }: DataErrorStateProps) {
  const theme = useTheme();
  const t = useTranslations('Common.dataError');

  if (!error) return null;
  const copy = COPY[error.kind];

  return (
    <Box
      role="status"
      aria-live="polite"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: dense ? 0.75 : 1.25,
        px: 2,
        py: dense ? 2 : 3,
        borderRadius: 3,
        bgcolor: alpha(theme.palette.brand[100], 0.5),
        // text.primary throughout: brand mid-tones fail WCAG AA on this pastel.
        color: 'text.primary',
      }}
    >
      {!dense && (
        <Typography aria-hidden component="span" sx={{ fontSize: '1.75rem', lineHeight: 1 }}>
          {copy.icon}
        </Typography>
      )}

      <Typography
        sx={{ fontWeight: 700, fontSize: dense ? '0.9rem' : '1rem', textAlign: 'center' }}
      >
        {t(copy.title)}
      </Typography>

      <Typography
        sx={{
          fontSize: dense ? '0.8rem' : '0.875rem',
          textAlign: 'center',
          maxWidth: 320,
        }}
      >
        {t(copy.body)}
      </Typography>

      {onRetry && error.kind !== 'auth' && (
        <Button
          variant="contained"
          size={dense ? 'small' : 'medium'}
          onClick={onRetry}
          sx={{ mt: 0.5 }}
        >
          {t('tryAgain')}
        </Button>
      )}
    </Box>
  );
}
