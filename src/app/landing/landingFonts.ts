import { Poppins } from 'next/font/google';

import { withJpFallback } from '@/theme';

/**
 * The marketing display face, self-hosted through next/font.
 *
 * The app themes hand headings a serif (`fonts.display` — DM Serif Display on
 * sakura), which is right inside the product but wrong on the landing page: the
 * brand comps use a heavy geometric sans for every headline. Poppins is the
 * closest widely-available match to those comps and sits well next to Nunito,
 * which stays the body face.
 *
 * next/font rather than the runtime `ThemeFonts` loader on purpose. The landing
 * page is statically prerendered and its headline is the LCP element, so the
 * face has to be self-hosted and preloaded with the HTML — the loader injects
 * its stylesheet after hydration, which is fine for app chrome but would flash
 * the fallback under the biggest text on the page.
 */
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-landing-display',
  display: 'swap',
});

/** Class that exposes `--font-landing-display`; put it on the landing root. */
export const landingFontClass = poppins.variable;

/**
 * Stack for every landing headline. Nunito backs the variable up so the pre-swap
 * paint is close, and `withJpFallback` splices the Japanese chain in — /landing/ja
 * renders its whole headline in Japanese, and Poppins has no CJK glyphs.
 */
export const LANDING_DISPLAY_FONT = withJpFallback(
  'var(--font-landing-display), "Nunito", sans-serif',
);
