'use client';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import { Box, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { useDueCount } from '@/hooks/useDueCount';

/**
 * The single home-screen entry point to Review. When cards are due it's a
 * bright, inviting "N due today" call to action; when nothing is due it stays as
 * a calm "all caught up" state. Either way it leads to /review — the practice
 * hub (due-cards hero + games). No SRS jargon ever surfaces — just "Review".
 *
 * `onDark` is for the home greeting hero, where the tile sits on the mascot's
 * night sky: the caught-up state's pale surface and dark type would vanish
 * there, so it switches to a translucent white surface with white type.
 */
export function ReviewTile({ onDark = false }: { onDark?: boolean } = {}) {
  const router = useRouter();
  const theme = useTheme();
  const { brand, accent } = theme.palette;
  const { dueCount, loading, error } = useDueCount();
  const t = useTranslations('Review.reviewTile');

  // Don't flash a placeholder before the count is known — and if the count
  // failed to load, hide the tile rather than falsely claim "all caught up".
  if (loading || error) return null;

  const due = dueCount > 0;
  const go = () => router.push('/review');

  // Three surfaces, not two: due (always the bright gradient), caught-up on the
  // night hero, and caught-up on the page background.
  const calmBg = onDark ? alpha('#fff', 0.14) : alpha(brand[50], 0.7);
  const calmBorder = onDark ? alpha('#fff', 0.28) : alpha(brand[300], 0.4);
  const onColor = due || onDark;

  return (
    <Box
      role="button"
      tabIndex={0}
      aria-label={due ? t('ariaReviewDue', { count: dueCount }) : t('ariaReviewCaughtUp')}
      onClick={go}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          go();
        }
      }}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        px: 2.5,
        py: 1.75,
        borderRadius: 3,
        cursor: 'pointer',
        transition: 'all 0.18s ease',
        border: due ? 'none' : `1.5px solid ${calmBorder}`,
        background: due ? `linear-gradient(135deg, ${brand[500]} 0%, ${accent[500]} 100%)` : calmBg,
        boxShadow: due ? `0 6px 20px ${alpha(brand[400], 0.35)}` : 'none',
        '&:hover': {
          transform: 'translateY(-1px)',
          boxShadow: due
            ? `0 8px 26px ${alpha(brand[400], 0.45)}`
            : `0 2px 10px ${alpha(brand[300], 0.2)}`,
          ...(due
            ? {}
            : {
                bgcolor: onDark ? alpha('#fff', 0.22) : alpha(brand[100], 0.9),
                borderColor: onDark ? alpha('#fff', 0.4) : alpha(brand[400], 0.55),
              }),
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 44,
          height: 44,
          borderRadius: '50%',
          flexShrink: 0,
          bgcolor: onColor ? alpha('#fff', 0.22) : alpha(brand[200], 0.5),
        }}
      >
        <Typography sx={{ fontSize: '1.5rem', lineHeight: 1 }}>{due ? '🎯' : '🌿'}</Typography>
      </Box>
      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
        <Typography
          variant="subtitle1"
          sx={{ fontWeight: 800, lineHeight: 1.2, color: onColor ? '#fff' : 'text.primary' }}
        >
          {t('review')}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            color: onColor ? alpha('#fff', 0.92) : 'text.secondary',
          }}
        >
          {due ? t('wordsWaiting', { count: dueCount }) : t('allCaughtUp')}
        </Typography>
      </Box>
      <ChevronRightRoundedIcon
        sx={{ color: onColor ? alpha('#fff', 0.9) : brand[500], flexShrink: 0 }}
      />
    </Box>
  );
}
