'use client';

import { createTheme, ThemeProvider, useTheme } from '@mui/material/styles';
import { type ReactNode, useMemo } from 'react';

import { LANDING_DISPLAY_FONT } from './landingFonts';

/**
 * Swaps the theme's serif display face for the marketing one, for the landing
 * tree only.
 *
 * Every section reads `theme.fonts.display` for its headings, badges and CTA
 * labels, so overriding that one key re-faces the whole page without touching a
 * single section — and without changing `fonts.display` for the app, where the
 * serif is the intended look. Product surfaces embedded in the page (the demo
 * Flashcards) read `fonts.jp` / `fonts.mono`, which are left alone so they keep
 * rendering exactly as they do inside the app.
 */
export function LandingTheme({ children }: { children: ReactNode }) {
  const base = useTheme();

  const theme = useMemo(
    () => createTheme(base, { fonts: { display: LANDING_DISPLAY_FONT } }),
    [base],
  );

  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}
