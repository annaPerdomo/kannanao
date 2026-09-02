'use client';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Box, Button, Collapse, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { DataErrorState } from '@/components/DataErrorState';
import { GameTiles } from '@/components/Games';
import { Loading } from '@/components/Loading';
import { PageHeader } from '@/components/PageHeader';
import { useDailyFocus } from '@/hooks/useDailyPractice';
import { previewMinutes } from '@/lib/dailyPractice';
import { LAYOUT } from '@/theme';

const GAMES_PARAM = 'games';

const heroSx = {
  borderRadius: 4,
  px: { xs: 3, sm: 4 },
  py: { xs: 3.5, sm: 4 },
  textAlign: 'center',
} as const;

function PracticeHero({
  dueCount,
  deckLabel,
  onStart,
}: {
  dueCount: number;
  deckLabel: string | null;
  onStart: () => void;
}) {
  const t = useTranslations('Review.hubPage');
  return (
    <Box
      sx={{
        ...heroSx,
        color: '#fff',
        background: (t) =>
          `linear-gradient(135deg, ${t.palette.brand[500]} 0%, ${t.palette.accent[500]} 100%)`,
        boxShadow: (t) => `0 8px 26px ${alpha(t.palette.brand[400], 0.35)}`,
      }}
    >
      <Typography sx={{ fontSize: '3rem', lineHeight: 1, mb: 1 }} aria-hidden>
        🎯
      </Typography>
      <Typography
        variant="caption"
        component="p"
        sx={{ fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', opacity: 0.8 }}
      >
        {t('todaysPractice')}
      </Typography>
      <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5 }}>
        {dueCount > 0 ? t('wordsWaiting', { count: dueCount }) : t('readyTitle')}
      </Typography>
      <Typography sx={{ color: alpha('#fff', 0.92), mb: 3 }}>
        {deckLabel
          ? dueCount > 0
            ? t('thenDeck', { deck: deckLabel })
            : t('fromDeck', { deck: deckLabel })
          : t('waitingBody')}
        {' · '}
        {t('minutesEstimate', { min: previewMinutes(dueCount, deckLabel !== null) })}
      </Typography>
      {/* Stock contained variant: the theme paints a gradient an sx bgcolor sits behind. */}
      <Button
        variant="contained"
        size="large"
        onClick={onStart}
        sx={{ borderRadius: 999, px: 5, py: 1.25, fontWeight: 800, fontSize: '1.05rem' }}
      >
        {t('startPractice')}
      </Button>
      <Typography variant="body2" sx={{ mt: 2, color: alpha('#fff', 0.85) }}>
        {t('whatHappens')}
      </Typography>
    </Box>
  );
}

function NothingYet() {
  const t = useTranslations('Review.hubPage');
  return (
    <Box
      sx={{
        ...heroSx,
        border: (t) => `1.5px solid ${alpha(t.palette.brand[300], 0.4)}`,
        bgcolor: (t) => alpha(t.palette.brand[50], 0.7),
      }}
    >
      <Typography sx={{ fontSize: '3rem', lineHeight: 1, mb: 1 }} aria-hidden>
        🌱
      </Typography>
      <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5 }}>
        {t('nothingYetTitle')}
      </Typography>
      <Typography sx={{ color: 'text.secondary' }}>{t('nothingYetBody')}</Typography>
    </Box>
  );
}

export default function ReviewHubPage() {
  const t = useTranslations('Review.hubPage');
  const tKana = useTranslations('KanaJourney.tile');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { dueCount, focus, empty, loading, error, retry } = useDailyFocus();
  const [gamesOpen, setGamesOpen] = useState(searchParams?.get(GAMES_PARAM) === '1');

  const deckLabel = focus ? `${focus.emoji} ${focus.deckName}`.trim() : null;

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
            🎯
          </Box>
        }
        title={t('title')}
        subtitle={t('subtitle')}
        onBack={() => router.push('/')}
        mb={{ xs: 2, sm: 3 }}
      />

      {loading ? (
        <Loading />
      ) : error ? (
        <DataErrorState error={error} onRetry={retry} />
      ) : empty ? (
        <NothingYet />
      ) : (
        <PracticeHero
          dueCount={dueCount}
          deckLabel={deckLabel}
          onStart={() => router.push('/review/start')}
        />
      )}

      <Box sx={{ mt: { xs: 3, sm: 4 } }}>
        <Button
          onClick={() => setGamesOpen((open) => !open)}
          aria-expanded={gamesOpen}
          aria-controls="extra-games"
          endIcon={
            <ExpandMoreIcon
              sx={{
                transform: gamesOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s ease',
              }}
            />
          }
          sx={{ fontWeight: 800, color: 'text.primary' }}
        >
          {t('funWaysToPractice')}
        </Button>
        <Collapse in={gamesOpen} id="extra-games">
          <Box sx={{ pt: 1.5 }}>
            <GameTiles
              leading={[
                {
                  title: tKana('title'),
                  description: tKana('description'),
                  jpTitle: 'かなをまなぶ',
                  emoji: '🌸',
                  gradient: 'linear-gradient(135deg, #ec4899, #be185d)',
                  href: '/review/learn-kana',
                },
              ]}
            />
          </Box>
        </Collapse>
      </Box>
    </Box>
  );
}
