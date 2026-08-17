import { alpha, type SxProps, type Theme } from '@mui/material/styles';

export const FACE_SIZE = 52;

/**
 * Measured off the rendered card in a browser, not derived from the font sizes
 * — the Start button wraps to its own line at the hero's copy width, and the
 * text block is three lines tall before it does.
 */
export const LINE_HEIGHTS = {
  eyebrow: 20,
  title: 22,
  body: 20,
  button: 36,
  link: 39,
  weekDots: 14,
} as const;

/**
 * The card itself is fit-content; the skeleton can't be, because its rows are
 * percentage-width and would shrink the box to nothing.
 */
export const SKELETON_WIDTH = { xs: '100%', sm: 340, md: 460 } as const;

/** Shared by the card and its skeleton: same padding, same radius, same gap. */
export const cardShellSx: SxProps<Theme> = {
  display: 'flex',
  flexDirection: 'column',
  gap: 1,
  width: { xs: '100%', sm: 'fit-content' },
  maxWidth: '100%',
  p: 1.75,
  borderRadius: (theme) => theme.radii.md,
  // Sits on the hero artwork — a pale surface would vanish into the banner.
  bgcolor: alpha('#fff', 0.16),
  border: `1.5px solid ${alpha('#fff', 0.3)}`,
  backdropFilter: 'blur(4px)',
};
