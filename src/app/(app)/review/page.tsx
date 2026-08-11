'use client';
import { Alert, Box, Button, Grid, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { GameTiles } from '@/components/Games';
import { Loading } from '@/components/Loading';
import { PageHeader } from '@/components/PageHeader';
import { useDueCount } from '@/hooks/useDueCount';
import { LAYOUT } from '@/theme';

/** Bright call-to-action when cards are waiting: count + one big start button. */
function DueHero({ count, onStart }: { count: number; onStart: () => void }) {
  const t = useTranslations('Review.hubPage');
  return (
    <Box
      sx={{
        borderRadius: 4,
        px: { xs: 3, sm: 4 },
        py: { xs: 3.5, sm: 4 },
        textAlign: 'center',
        color: '#fff',
        background: (t) =>
          `linear-gradient(135deg, ${t.palette.brand[500]} 0%, ${t.palette.accent[500]} 100%)`,
        boxShadow: (t) => `0 8px 26px ${alpha(t.palette.brand[400], 0.35)}`,
      }}
    >
      <Typography sx={{ fontSize: '3rem', lineHeight: 1, mb: 1 }}>⚔️</Typography>
      <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5 }}>
        {t('wordsWaiting', { count })}
      </Typography>
      <Typography sx={{ color: alpha('#fff', 0.92), mb: 3 }}>{t('waitingBody')}</Typography>
      <Button
        variant="contained"
        onClick={onStart}
        sx={{
          borderRadius: 999,
          px: 4,
          py: 1.25,
          fontWeight: 800,
          fontSize: '1rem',
          // The contained variant already paints the brand[600]→[700] gradient
          // with white text (theme/index.ts). Don't set `bgcolor`/`color` here:
          // `bgcolor` only sets background-color, which sits *behind* the opaque
          // gradient background-image and never shows — so a light text color set
          // to pair with it renders dark-on-dark and goes illegible (worst on
          // rose gold, where both are deep reds). White-on-gradient is legible on
          // every theme since brand[600]/[700] are dark across all schemes.
        }}
      >
        {t('startTodaysPractice')}
      </Button>
    </Box>
  );
}

/** Calm state when nothing is due — never a dead end; games are right below. */
function CaughtUpHero() {
  const t = useTranslations('Review.hubPage');
  return (
    <Box
      sx={{
        borderRadius: 4,
        px: { xs: 3, sm: 4 },
        py: { xs: 3.5, sm: 4 },
        textAlign: 'center',
        border: (t) => `1.5px solid ${alpha(t.palette.brand[300], 0.4)}`,
        bgcolor: (t) => alpha(t.palette.brand[50], 0.7),
      }}
    >
      <Typography sx={{ fontSize: '3rem', lineHeight: 1, mb: 1 }}>🌿</Typography>
      <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5 }}>
        {t('caughtUpTitle')}
      </Typography>
      <Typography sx={{ color: 'text.secondary' }}>{t('caughtUpBody')}</Typography>
    </Box>
  );
}

/**
 * Review — the single cross-deck practice home. Reads top-to-bottom as: what's
 * due today → one big start button (the flip-review flow at /review/today) →
 * fun games that practice the same due cards first. The home hero's adventure
 * card links here; no SRS jargon ever surfaces.
 */
export default function ReviewHubPage() {
  const t = useTranslations('Review.hubPage');
  const router = useRouter();
  const { dueCount, loading, error } = useDueCount();

  return (
    <Box
      sx={{
        // Wider than the narrow column: on a sideways tablet the hero and the
        // games sit side by side instead of stacking past the fold.
        maxWidth: { xs: LAYOUT.narrowMaxWidth, md: LAYOUT.headerMaxWidth },
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

      <Grid container spacing={{ xs: 3, md: 4 }} alignItems="flex-start">
        <Grid size={{ xs: 12, md: 4 }}>
          {loading ? (
            <Loading />
          ) : error ? (
            <Alert severity="error" sx={{ borderRadius: 3 }}>
              {t('loadError')}
            </Alert>
          ) : dueCount > 0 ? (
            <DueHero count={dueCount} onStart={() => router.push('/review/today')} />
          ) : (
            <CaughtUpHero />
          )}
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <Typography
            variant="h6"
            sx={{ fontWeight: 800, color: 'text.primary', mt: { xs: 1, md: 0 }, mb: 2 }}
          >
            {t('funWaysToPractice')}
          </Typography>
          <GameTiles />
        </Grid>
      </Grid>
    </Box>
  );
}
