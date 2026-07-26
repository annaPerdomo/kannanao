'use client';
import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

/** Six-sided medal outline. Slightly taller than wide, like a real badge. */
const HEXAGON = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';

interface LevelBadgeProps {
  level: number;
  /** Rendered width in px; the badge is ~13% taller than this. */
  size?: number;
}

/**
 * The hexagonal level medal on the home XP card: a gradient hex carrying the
 * word "Level" and the number.
 *
 * Not decorative, and so not hidden from assistive tech — the card's copy names
 * the *next* level ("1,352 XP to level 11"), which makes this the only place the
 * current one is stated. The caption is a real word rather than a styled
 * abbreviation so it reads as "Level 10" either way.
 */
export function LevelBadge({ level, size = 60 }: LevelBadgeProps) {
  const t = useTranslations('Home.welcomeBanner');
  const { brand, accent } = useTheme().palette;

  return (
    <Box
      sx={{
        flexShrink: 0,
        width: size,
        height: Math.round(size * 1.13),
        clipPath: HEXAGON,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1px',
        color: '#fff',
        background: `linear-gradient(160deg, ${brand[300]} 0%, ${brand[500]} 52%, ${accent[600]} 100%)`,
        filter: `drop-shadow(0 6px 14px ${alpha(brand[500], 0.4)})`,
      }}
    >
      <Typography
        component="span"
        sx={{
          fontSize: size * 0.135,
          fontWeight: 900,
          lineHeight: 1,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          opacity: 0.85,
        }}
      >
        {t('levelBadgeLabel')}
      </Typography>
      <Typography
        component="span"
        sx={{
          fontSize: size * 0.43,
          fontWeight: 900,
          lineHeight: 1,
          textShadow: '0 2px 6px rgba(0,0,0,0.28)',
        }}
      >
        {level}
      </Typography>
    </Box>
  );
}
