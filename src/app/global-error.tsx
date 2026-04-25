'use client';
import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

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
          <Typography variant="h5">Something went wrong</Typography>
          <Typography variant="body2" color="text.secondary">
            {process.env.NODE_ENV === 'development'
              ? error.message
              : 'A critical error occurred. Please refresh the page.'}
          </Typography>
          <Button variant="contained" onClick={reset}>
            Try again
          </Button>
        </Box>
      </body>
    </html>
  );
}
