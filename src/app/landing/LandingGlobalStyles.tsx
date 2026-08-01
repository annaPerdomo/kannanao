'use client';

import GlobalStyles from '@mui/material/GlobalStyles';
import { useEffect } from 'react';

import { LANDING_DISPLAY_FONT } from './landingFonts';

export default function LandingGlobalStyles() {
  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'smooth';
    return () => {
      document.documentElement.style.scrollBehavior = '';
    };
  }, []);

  return (
    <GlobalStyles
      styles={{
        // Headline weights, in one place instead of on 14 `sx` props.
        //
        // Sections render their headings as `<Typography component="h2">` with
        // no `variant`, so they inherit body1's weight (500) and the theme's
        // `typography.h2` never applies. That was invisible under the serif,
        // which ships a single weight — under Poppins it reads far too light.
        // An id-scoped element selector outranks the emotion class `sx` emits,
        // and applies to any heading a future section adds.
        '#landing-root :is(h1, h2)': {
          fontFamily: LANDING_DISPLAY_FONT,
          fontWeight: 800,
          letterSpacing: '-0.028em',
        },
        '#landing-root :is(h3, h4)': {
          fontFamily: LANDING_DISPLAY_FONT,
          fontWeight: 700,
          letterSpacing: '-0.018em',
        },
        // sakuraFall keyframes moved into SakuraFallEffect (emotion `keyframes`)
        // so the effect is self-contained and mountable outside the landing.
        '@keyframes cursorBlink': {
          '0%,49%': { opacity: '1' },
          '50%,100%': { opacity: '0' },
        },
        '@keyframes chipPopIn': {
          '0%': { opacity: '0', transform: 'scale(0.7)' },
          '70%': { transform: 'scale(1.05)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        '@keyframes floatUp': {
          '0%': { transform: 'translateY(0) rotate(0deg)', opacity: '0' },
          '20%': { opacity: '1' },
          '80%': { opacity: '1' },
          '100%': { transform: 'translateY(-120px) rotate(8deg)', opacity: '0' },
        },
        '@keyframes gentleBounce': {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        '@keyframes slideInLeft': {
          '0%': { opacity: '0', transform: 'translateX(-24px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        '@keyframes pulseGlow': {
          '0%,100%': { boxShadow: '0 0 0 0 rgba(0,0,0,0.1)' },
          '50%': { boxShadow: '0 0 20px 4px rgba(0,0,0,0.08)' },
        },
        '@keyframes progressFill': {
          '0%': { width: '0%' },
          '100%': { width: 'var(--target-width)' },
        },
      }}
    />
  );
}
