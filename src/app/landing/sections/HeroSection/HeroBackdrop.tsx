'use client';

import Box from '@mui/material/Box';
import { alpha } from '@mui/material/styles';
import { getImageProps } from 'next/image';

import { pink } from '@/theme';

// Aspect, not width: a 768px tablet is under every width breakpoint we own and
// still crops the portrait file's friends in half, while a phone turned
// sideways wants the landscape cut.
const LANDSCAPE = '(min-aspect-ratio: 3/5)';

const SHARED = { alt: '', sizes: '100vw', quality: 80, priority: true } as const;

// Two cuts of the same sakura-valley scene: the landscape file keeps the
// friends in a row under open sky for the copy and the demo, the portrait one
// stacks canopy, valley and friends down the screen. Full bleed, no masks —
// readability comes from text halos and the wash below.
export function HeroBackdrop() {
  const { props: landscape } = getImageProps({
    ...SHARED,
    src: '/landing/hero-friends.webp',
    width: 1672,
    height: 941,
  });
  const { props: portrait } = getImageProps({
    ...SHARED,
    src: '/landing/hero-friends-mobile.webp',
    width: 853,
    height: 1844,
  });

  return (
    <>
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
        }}
      >
        {/* `cover` on a portrait hero crops the 16:9 painting to its middle
            third, so phones need their own cut rather than the same source
            scaled. <picture> rather than two next/image tags because a
            `display: none` <img> is still downloaded; getImageProps keeps each
            source's per-device srcSet, which a hand-written path would lose. */}
        <Box component="picture" sx={{ display: 'block', width: '100%', height: '100%' }}>
          <source media={LANDSCAPE} srcSet={landscape.srcSet} sizes={landscape.sizes} />
          <Box
            component="img"
            alt=""
            src={portrait.src}
            srcSet={portrait.srcSet}
            sizes={portrait.sizes}
            // getImageProps drops next/image's `priority`, so no <head> preload
            // link comes back and the request priority has to be set by hand.
            // The element is first in the body; the preload scanner finds it.
            fetchPriority="high"
            decoding="async"
            sx={{
              display: 'block',
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              // The crop comes off the top canopy and the bottom flowerbed,
              // never the friends (62%–80% of the file's height).
              objectPosition: { xs: '50% 42%', lg: 'center' },
            }}
          />
        </Box>
      </Box>

      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          background: {
            // Stacked: front-loaded onto the top fifth, where the headline
            // crosses saturated canopy and its gradient measured ~2:1. Below
            // 18% it thins out so the phone still gets the scene the portrait
            // cut exists to show.
            xs: `linear-gradient(180deg, ${alpha(pink[50], 0.62)} 0%, ${alpha(pink[50], 0.58)} 18%, ${alpha(pink[50], 0.24)} 34%, ${alpha(pink[50], 0.08)} 56%, transparent 72%)`,
            // Side-by-side: a faint glow behind the headline, plus mist where
            // the CTA pills meet the leftmost friends on shorter viewports.
            lg: `radial-gradient(ellipse 58% 56% at 20% 16%, ${alpha('#fff', 0.45)} 0%, ${alpha('#fff', 0.2)} 55%, transparent 78%), radial-gradient(ellipse 40% 24% at 16% 64%, ${alpha(pink[50], 0.38)} 0%, transparent 72%)`,
          },
        }}
      />

      {/* Melts the artwork's last pixels into the AudienceSection's pink[50] top. */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 56,
          zIndex: 0,
          pointerEvents: 'none',
          background: `linear-gradient(180deg, transparent 0%, ${alpha(pink[50], 0.85)} 100%)`,
        }}
      />
    </>
  );
}
