'use client';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { Box, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useRouter } from 'next/navigation';

import { useDueCount } from '@/hooks/useDueCount';

/**
 * The single home-screen entry point to Smart Review. When cards are due it's a
 * bright, inviting "N due today" call to action; when nothing is due it stays as
 * a calm "all caught up" state that still leads to /review (which shows the
 * friendly all-done screen). No SRS jargon ever surfaces — just "Review".
 */
export function ReviewTile() {
  const router = useRouter();
  const theme = useTheme();
  const { brand, accent } = theme.palette;
  const { dueCount, loading } = useDueCount();

  // Don't flash a placeholder before the count is known.
  if (loading) return null;

  const due = dueCount > 0;
  const go = () => router.push('/review');

  return (
    <Box
      role="button"
      tabIndex={0}
      aria-label={due ? `Review — ${dueCount} due today` : 'Review — all caught up'}
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
        border: due ? 'none' : `1.5px solid ${alpha(brand[300], 0.4)}`,
        background: due
          ? `linear-gradient(135deg, ${brand[500]} 0%, ${accent[500]} 100%)`
          : alpha(brand[50], 0.7),
        boxShadow: due ? `0 6px 20px ${alpha(brand[400], 0.35)}` : 'none',
        '&:hover': {
          transform: 'translateY(-1px)',
          boxShadow: due
            ? `0 8px 26px ${alpha(brand[400], 0.45)}`
            : `0 2px 10px ${alpha(brand[300], 0.2)}`,
          ...(due ? {} : { bgcolor: alpha(brand[100], 0.9), borderColor: alpha(brand[400], 0.55) }),
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
          bgcolor: due ? alpha('#fff', 0.22) : alpha(brand[200], 0.5),
        }}
      >
        <Typography sx={{ fontSize: '1.5rem', lineHeight: 1 }}>{due ? '🎯' : '🌿'}</Typography>
      </Box>
      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
        <Typography
          variant="subtitle1"
          sx={{ fontWeight: 800, lineHeight: 1.2, color: due ? '#fff' : 'text.primary' }}
        >
          Review
        </Typography>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            color: due ? alpha('#fff', 0.92) : 'text.secondary',
          }}
        >
          {due
            ? `${dueCount} card${dueCount === 1 ? '' : 's'} due today`
            : 'All caught up — nothing due'}
        </Typography>
      </Box>
      {due && <AutoAwesomeIcon sx={{ color: alpha('#fff', 0.9), flexShrink: 0 }} />}
    </Box>
  );
}
