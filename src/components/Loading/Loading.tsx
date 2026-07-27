'use client';
import { alpha, Box, Typography, useTheme } from '@mui/material';

import { useReducedMotion } from '@/hooks/useReducedMotion';

import { dotBounce, MOBILE_SCALE, STAGE_HEIGHT, STAGE_WIDTH } from './constants';
import { TangoMascot } from './TangoMascot';

interface LoadingProps {
  /**
   * Status text under the mascot. Not localized here — callers own
   * translation (see Common.loading) — because Loading is imported from
   * statically-prerendered routes that only ship the next-intl namespaces
   * their own tree needs, and a `Common` dependency baked into this
   * component would leak onto every route that renders it.
   */
  message?: string;
}

/**
 * The app's loading state: Tango the Shiba Inu hopping in a sparkle-orbited
 * stage, with a speech bubble cycling through encouragement and the actual
 * status message underneath. The stage is built once at a fixed design size
 * and scaled as a single unit on narrow screens, so every animation inside
 * it (hop, blink, sparkle orbits, shimmer) stays correct at any size.
 */
export function Loading({ message = 'Loading…' }: LoadingProps) {
  const theme = useTheme();
  const { brand } = theme.palette;
  const reducedMotion = useReducedMotion();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: { xs: 3, sm: 4 },
        gap: 1.75,
      }}
    >
      <Box
        sx={{
          width: { xs: STAGE_WIDTH * MOBILE_SCALE, sm: STAGE_WIDTH },
          height: { xs: STAGE_HEIGHT * MOBILE_SCALE, sm: STAGE_HEIGHT },
        }}
      >
        <Box
          sx={{
            width: STAGE_WIDTH,
            height: STAGE_HEIGHT,
            transform: { xs: `scale(${MOBILE_SCALE})`, sm: 'none' },
            // Must be `top left`: the wrapper is pre-shrunk to STAGE_WIDTH *
            // MOBILE_SCALE, so scaling about the inner box's own centre pins
            // x=STAGE_WIDTH/2 and pushes the stage right of its wrapper by half
            // the size difference — the mascot drifts off-centre while the
            // status text below stays centred.
            transformOrigin: 'top left',
          }}
        >
          <TangoMascot reducedMotion={reducedMotion} />
        </Box>
      </Box>

      <Box
        sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.75, px: 2 }}
      >
        <Typography
          variant="caption"
          role="status"
          sx={{
            color: theme.palette.text.secondary,
            letterSpacing: '0.04em',
            fontWeight: 600,
            fontSize: '0.75rem',
            textAlign: 'center',
            maxWidth: 260,
          }}
        >
          {message}
        </Typography>

        <Box sx={{ display: 'flex', gap: 0.75 }}>
          {[0, 1, 2].map((i) => (
            <Box
              key={i}
              sx={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                bgcolor: i === 1 ? brand[400] : alpha(brand[300], 0.8),
                animation: reducedMotion ? 'none' : `${dotBounce} 1.2s ease-in-out infinite`,
                animationDelay: `${i * 0.15}s`,
              }}
            />
          ))}
        </Box>
      </Box>
    </Box>
  );
}
