'use client';
import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import { xpProgressInLevel } from '@/hooks/useProgress';

import { LevelBadge } from './LevelBadge';

interface XpProgressCardProps {
  level: number;
  totalXp: number;
  onShopClick: () => void;
}

/**
 * The home hero's XP panel: progress through the current level on the left, the
 * level medal on the right. Floats over the banner's right edge on wide screens
 * (see GreetingHero's aside), which is why the surface is near-opaque white with
 * a blur behind it rather than a flat card — it has painted sky underneath it.
 *
 * The whole card is the entry point to the Shop, which is where spendable XP
 * goes. It doesn't restate the spendable total: the nav bar's XP chip is on
 * screen directly above it and already does, and this card only has room to make
 * one point well.
 */
export function XpProgressCard({ level, totalXp, onShopClick }: XpProgressCardProps) {
  const t = useTranslations('Home.welcomeBanner');
  const { palette, radii } = useTheme();
  const { brand, accent } = palette;

  const { current, needed } = xpProgressInLevel(totalXp);
  const pct = Math.round((current / needed) * 100);

  return (
    <Box
      role="button"
      tabIndex={0}
      aria-label={t('openShopAriaLabel')}
      onClick={onShopClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onShopClick();
        }
      }}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.75,
        px: 2,
        py: 1.875,
        borderRadius: radii.md,
        cursor: 'pointer',
        bgcolor: alpha(palette.background.paper, 0.96),
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: `1.5px solid ${alpha(brand[300], 0.45)}`,
        boxShadow: `0 18px 40px ${alpha(brand[900], 0.28)}`,
        transition: 'transform 0.18s ease, box-shadow 0.18s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: `0 22px 44px ${alpha(brand[900], 0.34)}`,
        },
        '@keyframes shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {/* The label and the fraction each keep their own words together and
            drop onto separate lines when there isn't room. Never ellipsis: a
            truncated "2…" would be a lie about the XP total. */}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="baseline"
          gap={1}
          mb={1}
          sx={{ flexWrap: 'wrap' }}
        >
          {/* body2, not caption: this theme's caption face is monospaced, which
              turns the one number the card exists to show into a readout. */}
          <Typography
            variant="body2"
            sx={{
              fontWeight: 900,
              fontSize: '0.65rem',
              letterSpacing: '0.11em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              color: 'text.secondary',
            }}
          >
            {t('xpProgressLabel')}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 900,
              fontSize: '0.82rem',
              whiteSpace: 'nowrap',
              fontVariantNumeric: 'tabular-nums',
              color: accent[700],
            }}
          >
            {current} / {needed}
          </Typography>
        </Stack>

        <LinearProgress
          variant="determinate"
          value={pct}
          sx={{
            height: 8,
            borderRadius: radii.pill,
            bgcolor: alpha(brand[200], 0.5),
            '& .MuiLinearProgress-bar': {
              borderRadius: radii.pill,
              background: `linear-gradient(90deg, ${brand[400]}, ${accent[400]}, ${brand[300]}, ${accent[400]}, ${brand[400]})`,
              backgroundSize: '200% 100%',
              animation: 'shimmer 3s ease-in-out infinite',
              transition: 'width 0.6s ease',
            },
          }}
        />

        <Typography
          variant="body2"
          sx={{
            display: 'block',
            mt: 1,
            fontWeight: 700,
            fontSize: '0.78rem',
            color: 'text.secondary',
          }}
        >
          {/* The number is what the reader is actually looking for, so it gets
              the brand colour and the rest stays quiet around it. */}
          {t.rich('xpToLevel', {
            xp: (needed - current).toLocaleString(),
            level: level + 1,
            b: (chunks) => (
              <Box component="b" sx={{ color: brand[600], fontWeight: 900 }}>
                {chunks}
              </Box>
            ),
          })}
        </Typography>
      </Box>

      <LevelBadge level={level} />
    </Box>
  );
}
