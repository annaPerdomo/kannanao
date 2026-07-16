'use client';

import { Box } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';

import { useReducedMotion } from '@/hooks/useReducedMotion';
import { COMBO_THRESHOLDS } from '@/lib/combo';

interface ComboChipProps {
  /** Current combo run length. Hidden below 2 (a "combo" needs two in a row). */
  count: number;
}

/** How many combo thresholds this count has crossed — drives the chip's size. */
function tierFor(count: number): number {
  return COMBO_THRESHOLDS.filter((t) => count >= t.count).length;
}

/**
 * The "×3 🔥" combo chip that sits by the progress bar. It grows a little at
 * each threshold and gives a small pop when it first reaches one — unless the
 * user prefers reduced motion, in which case it just changes size with no
 * animation. Purely presentational; the bonus XP is awarded by useCombo.
 */
export function ComboChip({ count }: ComboChipProps) {
  const theme = useTheme();
  const { accent } = theme.palette;
  const reducedMotion = useReducedMotion();
  const t = useTranslations('Review.comboChip');

  if (count < 2) return null;

  const tier = tierFor(count);
  const scale = 1 + tier * 0.12;

  return (
    <Box
      // Re-key on the count so the pop replays each time the number changes.
      key={reducedMotion ? undefined : count}
      role="status"
      aria-label={t('ariaCombo', { count })}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.4,
        px: 1,
        py: 0.25,
        borderRadius: 999,
        flexShrink: 0,
        fontWeight: 800,
        fontSize: '0.8rem',
        lineHeight: 1.4,
        color: accent[700],
        bgcolor: alpha(accent[300], 0.2 + tier * 0.06),
        border: `1px solid ${alpha(accent[400], 0.4 + tier * 0.1)}`,
        transform: `scale(${scale})`,
        transformOrigin: 'center',
        transition: reducedMotion ? 'none' : 'transform 0.18s ease, background-color 0.18s ease',
        ...(reducedMotion
          ? {}
          : {
              animation: 'comboPop 0.32s cubic-bezier(0.34, 1.56, 0.64, 1)',
              '@keyframes comboPop': {
                '0%': { transform: `scale(${scale * 0.7})` },
                '60%': { transform: `scale(${scale * 1.18})` },
                '100%': { transform: `scale(${scale})` },
              },
            }),
      }}
    >
      <Box component="span">×{count}</Box>
      <Box component="span" aria-hidden>
        🔥
      </Box>
    </Box>
  );
}
