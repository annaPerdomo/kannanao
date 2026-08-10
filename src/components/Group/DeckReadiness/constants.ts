import { alpha, type Theme } from '@mui/material/styles';

export const COLLAPSED_ROWS = 5;

/**
 * One hue stepped light→dark: strong / learning / unseen is a magnitude scale,
 * so a second hue would invent a distinction that isn't there.
 */
export function tierColors(theme: Theme) {
  const { brand } = theme.palette;
  return {
    strong: brand[600],
    learning: brand[300],
    unseen: alpha(brand[300], 0.35),
  };
}
