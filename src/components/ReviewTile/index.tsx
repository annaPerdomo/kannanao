'use client';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import { Box, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { useDueCount } from '@/hooks/useDueCount';

interface ReviewTileProps {
  /**
   * For the home greeting hero, where the tile sits on the mascot's sky: the
   * caught-up state's pale surface and dark type would vanish there, so it
   * switches to a translucent white surface with white type.
   */
  onDark?: boolean;
  /**
   * Renders as a single gradient pill — "24 cards due today ›" — instead of the
   * three-row tile. For the hero, where the banner art needs the room and the
   * count is the only thing worth saying.
   */
  compact?: boolean;
}

/**
 * The single home-screen entry point to Review. When cards are due it's a
 * bright, inviting "N due today" call to action; when nothing is due it stays as
 * a calm "all caught up" state. Either way it leads to /review — the practice
 * hub (due-cards hero + games). No SRS jargon ever surfaces — just "Review".
 */
export function ReviewTile({ onDark = false, compact = false }: ReviewTileProps = {}) {
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
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      go();
    }
  };

  if (compact) {
    return (
      <Box
        role="button"
        tabIndex={0}
        aria-label={due ? t('ariaReviewDue', { count: dueCount }) : t('ariaReviewCaughtUp')}
        onClick={go}
        onKeyDown={onKeyDown}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          // Trimmed on phones so "24 cards due today ›" stays on one line even
          // on a 320px screen.
          gap: { xs: 1, sm: 1.25 },
          px: { xs: 2, sm: 2.75 },
          py: { xs: 1.375, sm: 1.625 },
          borderRadius: theme.radii.md,
          cursor: 'pointer',
          fontWeight: 800,
          fontSize: { xs: '0.9rem', sm: '1rem' },
          color: '#fff',
          // Caught-up keeps the same shape but drops the shout: a translucent
          // pill on the artwork rather than a gradient asking to be pressed.
          background: due
            ? `linear-gradient(90deg, ${brand[500]}, ${accent[500]})`
            : alpha('#fff', 0.18),
          border: due ? 'none' : `1.5px solid ${alpha('#fff', 0.35)}`,
          boxShadow: due ? `0 12px 26px ${alpha(brand[900], 0.45)}` : 'none',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            ...(due ? {} : { bgcolor: alpha('#fff', 0.26) }),
          },
        }}
      >
        {/* No icon here on purpose: the pill sits on painted artwork and the
            count is the whole message. The full tile keeps its emoji. */}
        {due ? t('cardsDueToday', { count: dueCount }) : t('allCaughtUp')}
        <ChevronRightRoundedIcon sx={{ fontSize: '1.35rem', flexShrink: 0 }} />
      </Box>
    );
  }

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
      onKeyDown={onKeyDown}
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
