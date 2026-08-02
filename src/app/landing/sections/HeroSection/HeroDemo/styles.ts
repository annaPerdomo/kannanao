import { alpha } from '@mui/material/styles';

import { pink, purple } from '@/theme';

/**
 * A tight contact shadow, a wide ambient one, and a rim highlight along the top
 * edge. Tinted purple/pink, never black — a neutral shadow reads as a hole
 * punched in the cherry-blossom sky.
 */
export const floatingSurfaceShadow = (depth: 'window' | 'phone') =>
  depth === 'window'
    ? [
        `0 1px 2px ${alpha(purple[700], 0.06)}`,
        `0 18px 36px -14px ${alpha(purple[700], 0.24)}`,
        `0 56px 84px -48px ${alpha(pink[600], 0.4)}`,
        `inset 0 1px 0 ${alpha('#fff', 0.75)}`,
      ].join(', ')
    : [
        `0 2px 4px ${alpha(purple[900], 0.12)}`,
        `0 22px 40px -12px ${alpha(purple[700], 0.34)}`,
        `0 48px 64px -40px ${alpha(pink[600], 0.38)}`,
      ].join(', ');

/**
 * "Educator view" / "Learner view" tags pinned to a frame's corner. Deliberately
 * carries no transform: as a child of a `preserve-3d` frame it is already
 * coplanar with the surface it names. Any extra yaw here reads as a label
 * floating at an angle nothing else in the scene shares.
 */
export const frameTagSx = (color: typeof pink) =>
  ({
    position: 'absolute',
    bgcolor: alpha('#fff', 0.92),
    color: color[700],
    fontWeight: 800,
    fontSize: '0.72rem',
    letterSpacing: '0.02em',
    border: `1px solid ${alpha(color[400], 0.45)}`,
    boxShadow: `0 4px 14px ${alpha(color[700], 0.16)}`,
  }) as const;
