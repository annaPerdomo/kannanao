import { alpha, type SxProps, type Theme } from '@mui/material/styles';

import { HERO_SCRIM } from '@/theme/scrim';

export const FACE_SIZE = 52;

/**
 * Measured off the rendered card in a browser, not derived from the theme's font
 * sizes. Except `eyebrow`, which is Eyebrow's own 0.72rem × 1.4.
 */
export const LINE_HEIGHTS = {
  eyebrow: 16,
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

/**
 * Two surfaces because the card sits on two things: the hero's flat plum block
 * on a phone, the banner artwork from sm up. The dark wash is what carries the
 * card's 14px white text to 4.5:1 — the hero's scrim is tuned for the greeting's
 * 3:1 and won't do it.
 */
const CARD_BG = { xs: alpha('#fff', 0.16), sm: `rgba(${HERO_SCRIM}, 0.6)` } as const;

/** Shared by the card and its skeleton: same padding, same radius, same gap. */
export const cardShellSx: SxProps<Theme> = {
  display: 'flex',
  flexDirection: 'column',
  gap: 1,
  width: { xs: '100%', sm: 'fit-content' },
  maxWidth: '100%',
  p: 1.75,
  borderRadius: (theme) => theme.radii.md,
  bgcolor: CARD_BG,
  border: `1.5px solid ${alpha('#fff', 0.3)}`,
  backdropFilter: 'blur(4px)',
};

/**
 * Beside CARD_BG so the two can't drift: a flat hover colour outranks the map at
 * every breakpoint and puts the pale phone wash back over the artwork.
 */
export const cardHoverBgSx = { xs: alpha('#fff', 0.22), sm: `rgba(${HERO_SCRIM}, 0.7)` } as const;
