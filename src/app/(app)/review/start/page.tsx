'use client';
import { Box, Button, Stack, Typography } from '@mui/material';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

import { DataErrorState } from '@/components/DataErrorState';
import { Loading } from '@/components/Loading';
import { useDailyFocus } from '@/hooks/useDailyPractice';
import { useStartDailyPractice } from '@/hooks/usePracticeChain';
import { useJapaneseVoice } from '@/hooks/useSpeech';
import { LAYOUT } from '@/theme';

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        maxWidth: LAYOUT.narrowMaxWidth,
        mx: 'auto',
        px: LAYOUT.pagePx,
        py: { xs: 3, sm: 6 },
        textAlign: 'center',
      }}
    >
      {children}
    </Box>
  );
}

export default function PracticeStartPage() {
  const t = useTranslations('Review.startPage');
  const router = useRouter();
  const { dueCount, focus, empty, loading, error, retry } = useDailyFocus();
  // Voice is settled before planning: a voiceless browser hangs on a Listen leg mid-chain.
  const voice = useJapaneseVoice();
  const start = useStartDailyPractice();
  const [startError, setStartError] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    if (loading || error || empty || voice === 'checking' || startedRef.current) return;
    startedRef.current = true;
    start(focus, dueCount, voice === 'ready').then(
      (ok) => {
        if (!ok) setStartError(true);
      },
      () => setStartError(true),
    );
  }, [loading, error, empty, voice, start, focus, dueCount]);

  if (error) {
    return (
      <Frame>
        <DataErrorState error={error} onRetry={retry} />
      </Frame>
    );
  }

  if (empty || startError) {
    return (
      <Frame>
        <Typography sx={{ fontSize: '3.5rem', mb: 1 }} aria-hidden>
          🌱
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', mb: 1 }}>
          {t('nothingYetTitle')}
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 4 }}>
          {startError ? t('startFailedBody') : t('nothingYetBody')}
        </Typography>
        <Stack direction="row" spacing={2} justifyContent="center">
          {startError && (
            <Button
              variant="contained"
              onClick={() => {
                startedRef.current = false;
                setStartError(false);
                retry();
              }}
            >
              {t('tryAgain')}
            </Button>
          )}
          <Button variant="outlined" onClick={() => router.push('/review')}>
            {t('playAGame')}
          </Button>
        </Stack>
      </Frame>
    );
  }

  return (
    <Frame>
      <Loading message={t('preparing')} />
    </Frame>
  );
}
