'use client';

import { useEffect } from 'react';

import { useColorScheme } from '@/contexts/ThemeContext';
import { buildFontHref } from '@/theme/fontLoader';

// Loads only the active theme's Google Fonts (~5 families) instead of all 20
// across every theme. Splitting per-theme cuts the font stylesheet from ~1.46 MB
// to ~355–560 KB depending on theme. Driven by the *rendered* scheme so the
// loaded fonts always match what MUI is drawing, and swaps on theme change.
//
// The sheet is injected as media="print" then promoted to "all" on load, so it
// never blocks first paint (matching the previous non-blocking behavior). The
// preceding theme's sheet is removed only once the new one has loaded, avoiding
// a flash back to fallback fonts during a switch. `display=swap` (baked into the
// URL) keeps text visible in a system fallback until the web fonts arrive.
export function ThemeFonts() {
  const { scheme } = useColorScheme();

  useEffect(() => {
    const href = buildFontHref(scheme);
    const existing = document.querySelectorAll<HTMLLinkElement>('link[data-theme-fonts]');
    for (const link of existing) {
      if (link.dataset.href === href) return; // already loaded for this theme
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.media = 'print';
    link.href = href;
    link.dataset.themeFonts = '';
    link.dataset.href = href;

    const promote = () => {
      link.media = 'all';
      // Drop every other theme-fonts sheet now that this one is applied.
      document
        .querySelectorAll<HTMLLinkElement>('link[data-theme-fonts]')
        .forEach((other) => other !== link && other.remove());
    };
    link.addEventListener('load', promote, { once: true });
    document.head.appendChild(link);
    // Cached sheets can be ready synchronously, before the load event fires.
    if (link.sheet) promote();
  }, [scheme]);

  return null;
}
