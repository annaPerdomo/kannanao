'use client';
import { Box } from '@mui/material';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';

import { DataErrorState } from '@/components/DataErrorState';
import { Loading } from '@/components/Loading';
import { PageHeader } from '@/components/PageHeader';
import { useKanaProgress } from '@/hooks/useKanaProgress';
import { getSet, isKanaSetId, type KanaTrack } from '@/lib/kanaCurriculum';
import { pickReviewQueue, REVIEW_SESSION_SIZE } from '@/lib/kanaProficiency';
import { LAYOUT } from '@/theme';

import { KanaChart } from './KanaChart';
import { KanaChartPrintButton } from './KanaChartPrintButton';
import { KanaCheck } from './KanaCheck';
import { KanaSession, type KanaSessionRequest } from './KanaSession';
import { ReviewButton } from './ReviewButton';

export function KanaJourneyScreen() {
  const t = useTranslations('KanaJourney.journey');
  const router = useRouter();
  const { byKana, loading, error, retry, record } = useKanaProgress();
  const assigned = useSearchParams()?.get('set') ?? null;
  const linkedSet = assigned !== null && isKanaSetId(assigned) ? assigned : null;
  const [track, setTrack] = useState<KanaTrack>(
    () => (linkedSet ? getSet(linkedSet)?.track : null) ?? 'hiragana',
  );
  const [session, setSession] = useState<KanaSessionRequest | null>(
    linkedSet ? { setId: linkedSet } : null,
  );
  const [checking, setChecking] = useState(false);

  const exitSession = useCallback(() => setSession(null), []);
  const playRow = useCallback((setId: string) => setSession({ setId }), []);
  const playKana = useCallback((kana: string) => setSession({ kana }), []);
  const review = useCallback(() => {
    if (!byKana) return;
    setSession({
      chars: pickReviewQueue(byKana, {
        track: 'both',
        size: REVIEW_SESSION_SIZE,
        includeStrong: true,
      }),
    });
  }, [byKana]);

  const startCheck = useCallback(() => setChecking(true), []);
  const finishCheck = useCallback(() => {
    setChecking(false);
    review();
  }, [review]);

  if (checking && byKana) {
    return (
      <KanaCheck
        byKana={byKana}
        record={record}
        onExit={() => setChecking(false)}
        onReview={finishCheck}
      />
    );
  }

  if (session && byKana) {
    return (
      <KanaSession
        key={session.setId ?? session.kana ?? session.chars?.join('')}
        setId={session.setId}
        kana={session.kana}
        chars={session.chars}
        byKana={byKana}
        record={record}
        onExit={exitSession}
      />
    );
  }

  return (
    <Box
      sx={{
        maxWidth: LAYOUT.narrowMaxWidth,
        mx: 'auto',
        px: LAYOUT.pagePx,
        py: { xs: 3, sm: 4 },
      }}
    >
      <PageHeader
        icon={
          <Box component="span" aria-hidden sx={{ fontSize: { xs: '1.7rem', sm: '2rem' } }}>
            🌸
          </Box>
        }
        title={t('title')}
        subtitle={t('subtitle')}
        onBack={() => router.push('/review')}
        mb={{ xs: 2, sm: 3 }}
      />

      {loading ? (
        <Loading message={t('loading')} />
      ) : error || !byKana ? (
        <DataErrorState error={error} onRetry={retry} />
      ) : (
        <>
          <ReviewButton byKana={byKana} onReview={review} onCheck={startCheck} />
          <KanaChart
            track={track}
            byKana={byKana}
            onTrackChange={setTrack}
            onPlayRow={playRow}
            onPlayKana={playKana}
          />
          <KanaChartPrintButton track={track} />
        </>
      )}
    </Box>
  );
}
