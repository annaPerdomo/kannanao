'use client';

import AutoAwesomeIcon from '@mui/icons-material/AutoAwesomeRounded';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import { NAVBAR_HEIGHT } from '@/components/NavBar';
import { SakuraDrift } from '@/components/SakuraDrift';
import { useInView } from '@/hooks/useInView';
import { amber, pink, purple } from '@/theme';

import { HeroBackdrop } from './HeroBackdrop';
import { HeroCtas } from './HeroCtas';
import { HeroDemo } from './HeroDemo';

export function HeroSection() {
  const t = useTranslations('Landing.hero');
  // Mounts the demo, not merely reveals it. `display: none` hides it from phones
  // but does not stop React: the stage's timers keep re-arming and the deck's
  // <img> cards download anyway — four Unsplash requests against the hero's LCP
  // on the devices least able to afford them. Nothing inside a display:none
  // ancestor ever intersects, so this gate stays shut on phones.
  const { ref: demoRef, inView: demoVisible } = useInView();

  return (
    <Box
      sx={{
        // svh, not vh: `100vh` on iOS Safari is the URL-bar-collapsed viewport,
        // so a vh-tall hero is always taller than what you can actually see.
        // The sticky NavBar sits above the hero in flow, so a full 100svh pushes
        // the artwork's bottom edge — the friends — off the fold by its height.
        minHeight: {
          xs: `calc(100svh - ${NAVBAR_HEIGHT.xs}px)`,
          sm: `calc(100svh - ${NAVBAR_HEIGHT.sm}px)`,
          md: `calc(100svh - ${NAVBAR_HEIGHT.md}px)`,
        },
        position: 'relative',
        overflow: 'hidden',
        bgcolor: pink[50],
        display: 'flex',
        pt: { xs: 3, sm: 5, lg: 5 },
        // Short viewports crop the artwork tighter, raising the friends' heads
        // toward the copy; reclaiming the top padding buys the row ~24px.
        '@media (min-width: 1200px) and (max-height: 900px)': { pt: 2 },
        // Below lg the copy stacks above the unveiled band of artwork at the
        // hero's bottom edge; this keeps it clear of the characters.
        pb: { xs: 26, sm: 32, lg: 4 },
        px: { xs: 2, sm: 4, md: 6, lg: 7 },
        // The headline is the LCP element wherever the artwork doesn't outsize
        // it, so its entrance must run from CSS (not useInView) and must not
        // touch opacity — Chrome ignores a candidate while opacity is 0, which
        // pins LCP to hydration.
        '@keyframes heroTextIn': {
          from: { transform: 'translateX(-48px)' },
          to: { transform: 'translateX(0)' },
        },
        '@keyframes heroCtasIn': {
          from: { transform: 'translateY(36px)' },
          to: { transform: 'translateY(0)' },
        },
      }}
    >
      <HeroBackdrop />
      <SakuraDrift zIndex={2} />

      <Box
        sx={{
          maxWidth: 1480,
          mx: 'auto',
          width: '100%',
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: { xs: 'column', lg: 'row' },
          alignItems: { xs: 'center', lg: 'flex-start' },
          justifyContent: { lg: 'space-between' },
          gap: { xs: 0, lg: 4 },
        }}
      >
        <Box
          sx={{
            maxWidth: { lg: 690, xl: 700 },
            width: { xs: '100%', lg: 'auto' },
            minWidth: 0,
            textAlign: { xs: 'center', lg: 'left' },
            position: 'relative',
            p: { lg: 3.5, xl: 4 },
            // Deliberately tighter than the other three sides: the card's bottom
            // edge lands in the painted friends, and every pixel here clips the
            // nearest one's ears. The waitlist link's own button padding covers.
            pb: { lg: 1.5, xl: 1.75 },
            mt: { lg: -1 },
            animation: 'heroTextIn 0.9s cubic-bezier(0.16,1,0.3,1) both',
            '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
          }}
        >
          {/* Frosted reading surface — the trees and sun glow behind the copy
              vary too much for halos alone. Below lg the backdrop's wash does it. */}
          <Box
            aria-hidden
            sx={{
              position: 'absolute',
              inset: 0,
              display: { xs: 'none', lg: 'block' },
              borderRadius: 7,
              bgcolor: alpha('#FFF8FB', 0.36),
              backdropFilter: 'blur(8px)',
              border: `1px solid ${alpha('#fff', 0.5)}`,
              boxShadow: `0 24px 60px ${alpha(purple[700], 0.07)}`,
            }}
          />
          <Box sx={{ position: 'relative' }}>
            <Chip
              icon={
                <AutoAwesomeIcon
                  sx={{ fontSize: '0.85rem !important', color: `${amber[700]} !important` }}
                />
              }
              label={t('waitlistBadge')}
              size="small"
              sx={{
                mb: { xs: 1.75, sm: 2 },
                bgcolor: alpha('#fff', 0.86),
                color: amber[700],
                fontWeight: 700,
                fontSize: { xs: '0.68rem', sm: '0.72rem' },
                border: `1px solid ${alpha(amber[400], 0.45)}`,
                borderRadius: 6,
              }}
            />

            <Typography
              component="h1"
              sx={{
                // Each step sets the longest headline line ("Remember forever.")
                // flush with the column's right padding at that breakpoint.
                fontSize: { xs: '2.1rem', sm: '2.9rem', lg: '3.35rem', xl: '3.75rem' },
                lineHeight: 1.02,
                mb: { xs: 1.75, sm: 2 },
                background: `linear-gradient(120deg, ${purple[600]} 0%, ${purple[500]} 30%, ${pink[500]} 70%, ${pink[600]} 100%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                // drop-shadow, not text-shadow: with background-clip text a
                // text-shadow paints over the transparent fill, in front of the
                // gradient.
                filter:
                  'drop-shadow(0 1px 2px rgba(255,255,255,0.9)) drop-shadow(0 4px 18px rgba(255,255,255,0.65))',
              }}
            >
              {t.rich('headline', { br: () => <br /> })}
            </Typography>

            <Typography
              sx={{
                fontSize: { xs: '0.95rem', sm: '1.05rem' },
                color: 'text.primary',
                fontWeight: 500,
                lineHeight: { xs: 1.55, sm: 1.7 },
                // Reaches the same right edge as the headline and the CTA row.
                maxWidth: { xs: 340, sm: 480, lg: 620, xl: 630 },
                mx: { xs: 'auto', lg: 0 },
                mb: { xs: 2.5, sm: 3 },
                textShadow: '0 1px 3px rgba(255,255,255,0.85), 0 2px 12px rgba(255,255,255,0.7)',
              }}
            >
              {t.rich('subtitle', { em: (chunks) => <em>{chunks}</em> })}
            </Typography>

            <HeroCtas />
          </Box>
        </Box>

        <Box
          ref={demoRef}
          sx={{
            display: { xs: 'none', lg: 'block' },
            flexShrink: 0,
            // Pulled off the container's right edge: the demo's perspective
            // turns its outer edge away, so flush right reads as falling off.
            mr: { lg: 3, xl: 9 },
            animation: 'heroCtasIn 0.9s cubic-bezier(0.16,1,0.3,1) both',
            '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
          }}
        >
          {demoVisible && <HeroDemo />}
        </Box>
      </Box>
    </Box>
  );
}
