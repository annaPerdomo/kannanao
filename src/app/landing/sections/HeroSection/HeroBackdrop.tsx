'use client';

import Box from '@mui/material/Box';
import { alpha } from '@mui/material/styles';
import Image from 'next/image';

import { pink } from '@/theme';

// A hero-specific cut of the sakura-valley scene: friends gathered in the middle
// and the whole top half open sky, which is the room the copy and the demo sit
// in. Full bleed, no masks — readability comes from text halos and a soft wash.
export function HeroBackdrop() {
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
        {/* next/image, not a bare <img>: this is the mobile LCP element and the
            source is 1672px wide, so a plain tag makes a 390px phone download all
            210 KB (`sizes` alone does nothing without a srcSet). `priority`
            replaces the preload a bare tag's fetchPriority gave. */}
        <Image
          alt=""
          src="/landing/hero-friends.webp"
          fill
          sizes="100vw"
          priority
          style={{
            objectFit: 'cover',
            // The painting is 16:9 and the hero box runs 1.75–1.9 on desktop, so
            // `cover` crops the sides, not the friends (62%–92% of the height).
            objectPosition: 'center',
          }}
        />
      </Box>

      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          background: {
            // Stacked: the copy sits directly over the scene, so wash the top
            // and let the artwork surface untouched at the bottom.
            xs: `linear-gradient(180deg, ${alpha(pink[50], 0.94)} 0%, ${alpha(pink[50], 0.9)} 52%, ${alpha(pink[50], 0.68)} 68%, ${alpha(pink[50], 0.2)} 82%, transparent 92%)`,
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
