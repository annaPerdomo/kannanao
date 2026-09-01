'use client';
import { Box } from '@mui/material';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';

import { DataErrorState } from '@/components/DataErrorState';
import { Loading } from '@/components/Loading';
import { PageHeader } from '@/components/PageHeader';
import { useKanaProgress } from '@/hooks/useKanaProgress';
import type { KanaTrack } from '@/lib/kanaCurriculum';
import { LAYOUT } from '@/theme';

import { IslandSession } from './IslandSession';
import { TrackPath } from './TrackPath';

export function KanaJourneyScreen() {
  const t = useTranslations('KanaJourney.journey');
  const router = useRouter();
  const { byKana, loading, error, retry, record } = useKanaProgress();
  const [track, setTrack] = useState<KanaTrack>('hiragana');
  const [playing, setPlaying] = useState<string | null>(null);

  const exitSession = useCallback(() => setPlaying(null), []);

  if (playing && byKana) {
    return (
      <IslandSession
        key={playing}
        setId={playing}
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
        <TrackPath track={track} byKana={byKana} onTrackChange={setTrack} onPlay={setPlaying} />
      )}
    </Box>
  );
}
