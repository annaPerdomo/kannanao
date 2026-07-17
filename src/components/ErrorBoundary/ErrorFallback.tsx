'use client';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

export function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
  const t = useTranslations('Common');
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: 2,
        p: 3,
        textAlign: 'center',
      }}
    >
      <Typography variant="h5" color="text.primary">
        {t('somethingWentWrong')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 480 }}>
        {process.env.NODE_ENV === 'development' ? error.message : t('errorFallbackBody')}
      </Typography>
      <Button variant="contained" onClick={resetError}>
        {t('retry')}
      </Button>
    </Box>
  );
}
