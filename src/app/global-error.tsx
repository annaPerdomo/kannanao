'use client';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { ThemeProvider } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

import { theme } from '@/theme';

// Catches React rendering errors in the root layout that escape all other error boundaries.
// Must include its own <html>/<body> since the root layout is unavailable when this renders.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      Sentry.captureException(error);
    }
  }, [error]);

  return (
    <html lang="en">
      <body>
        <ThemeProvider theme={theme}>
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
              bgcolor: 'background.default',
            }}
          >
            <Typography
              variant="h5"
              sx={{ fontWeight: 800, color: 'text.primary' }}
            >
              Something went wrong
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 400 }}>
              {process.env.NODE_ENV === 'development'
                ? error.message
                : 'A critical error occurred. Please refresh the page.'}
            </Typography>
            <Button
              variant="contained"
              onClick={reset}
              sx={{
                mt: 1,
                bgcolor: 'primary.main',
                textTransform: 'none',
                fontWeight: 700,
                borderRadius: 2,
                px: 3,
              }}
            >
              Try again
            </Button>
          </Box>
        </ThemeProvider>
      </body>
    </html>
  );
}
