'use client';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

/**
 * The night-sky palette the hero paints itself in. These are deliberately
 * literal rather than theme tokens: the mascot artwork ships as a cutout with a
 * transparent sky, so this gradient *is* the sky it sits in, and it has to stay
 * the artwork's sky whichever colour scheme the user has picked.
 */
const NIGHT = {
  from: '#3E3660',
  mid: '#4A4172',
  to: '#2C2745',
  /** Scrim over the artwork, so the greeting keeps its contrast at every width. */
  scrim: '44, 39, 69',
};

interface GreetingHeroProps {
  /** Time-of-day greeting, already interpolated with the user's name. */
  greeting: string;
  /** Call to action rendered under the greeting — the Review tile. */
  children?: React.ReactNode;
}

/**
 * The home dashboard's hero: the Tangodachi mascot's night illustration
 * bleeding off the right edge, with the greeting and the day's single call to
 * action over the sky on the left.
 *
 * Contrast is held by a scrim rather than by the artwork itself — the image is
 * decorative and the text must stay legible at every breakpoint, including the
 * narrow ones where the illustration slides under the copy.
 */
export function GreetingHero({ greeting, children }: GreetingHeroProps) {
  const t = useTranslations('Home.greeting');

  return (
    <Box
      sx={{
        position: 'relative',
        height: '100%',
        minHeight: { xs: 240, md: 264 },
        overflow: 'hidden',
        borderRadius: 4,
        display: 'flex',
        alignItems: 'center',
        background: `linear-gradient(135deg, ${NIGHT.from} 0%, ${NIGHT.mid} 48%, ${NIGHT.to} 100%)`,
        boxShadow: '0 14px 40px rgba(44, 39, 69, 0.28)',
      }}
    >
      {/* Decorative — the greeting text carries all the meaning here. */}
      <Box
        component="img"
        src="/mascot/greeting-night.webp"
        alt=""
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          left: 'auto',
          height: '100%',
          width: { xs: '58%', sm: '54%', md: '48%' },
          objectFit: 'cover',
          objectPosition: '50% 42%',
          maskImage: 'linear-gradient(90deg, transparent 0%, #000 32%)',
          WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, #000 32%)',
        }}
      />

      {/* Scrim: opaque where the copy sits, clearing before the mascot. On the
          narrow breakpoints the artwork slides under the copy, which is what
          the leading stop is for. */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          background: {
            // On phones the copy runs the full width, so the scrim has to stay
            // dense all the way across instead of clearing for the mascot.
            xs: `linear-gradient(90deg, rgba(${NIGHT.scrim},0.94) 0%, rgba(${NIGHT.scrim},0.86) 55%, rgba(${NIGHT.scrim},0.6) 85%, rgba(${NIGHT.scrim},0.4) 100%)`,
            sm: `linear-gradient(90deg, rgba(${NIGHT.scrim},0.92) 0%, rgba(${NIGHT.scrim},0.8) 42%, rgba(${NIGHT.scrim},0.25) 72%, transparent 90%)`,
          },
        }}
      />

      <Box
        sx={{
          position: 'relative',
          width: '100%',
          px: { xs: 2.5, sm: 4 },
          py: { xs: 3, sm: 3.5 },
        }}
      >
        <Typography
          variant="h4"
          sx={{
            fontWeight: 800,
            lineHeight: 1.1,
            color: '#fff',
            textShadow: '0 2px 12px rgba(0,0,0,0.35)',
            maxWidth: { sm: '72%' },
          }}
        >
          {greeting}
        </Typography>
        <Typography
          variant="body1"
          sx={{
            mt: 1,
            fontWeight: 600,
            color: 'rgba(255,255,255,0.86)',
            textShadow: '0 1px 8px rgba(0,0,0,0.35)',
            maxWidth: { sm: '72%' },
          }}
        >
          {t('subtitle')}
        </Typography>

        {/* Capped short of the mascot: the tile's own right edge (the chevron)
            has to stay off the artwork to keep reading as an affordance. */}
        {children && <Box sx={{ mt: 2.5, maxWidth: { sm: 400 } }}>{children}</Box>}
      </Box>
    </Box>
  );
}
