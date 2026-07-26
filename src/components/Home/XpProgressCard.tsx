'use client';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import StorefrontIcon from '@mui/icons-material/Storefront';
import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import { xpProgressInLevel } from '@/hooks/useProgress';
import { SHOP_ITEMS } from '@/hooks/useShop';

import { LevelBadge } from './LevelBadge';

interface XpProgressCardProps {
  level: number;
  totalXp: number;
  spendableXp: number;
  ownedItemKeys: string[];
  onShopClick: () => void;
}

/**
 * The home dashboard's XP panel: progress through the current level on the
 * left, the level medal on the right. The whole card is the entry point to the
 * Shop, which is where spendable XP goes.
 */
export function XpProgressCard({
  level,
  totalXp,
  spendableXp,
  ownedItemKeys,
  onShopClick,
}: XpProgressCardProps) {
  const t = useTranslations('Home.welcomeBanner');
  const { brand, accent } = useTheme().palette;

  const { current, needed } = xpProgressInLevel(totalXp);
  const pct = Math.round((current / needed) * 100);

  // The cheapest thing they haven't bought yet — a concrete reason to keep going.
  const nextItem =
    SHOP_ITEMS.filter((i) => i.price > 0 && !ownedItemKeys.includes(i.key)).sort(
      (a, b) => a.price - b.price,
    )[0] ?? null;
  const xpNeeded = nextItem ? Math.max(0, nextItem.price - spendableXp) : 0;

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
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: { xs: 1.5, sm: 2 },
        px: { xs: 2, sm: 2.5 },
        py: { xs: 2.5, sm: 3 },
        borderRadius: 4,
        cursor: 'pointer',
        bgcolor: 'background.paper',
        border: `1.5px solid ${alpha(brand[300], 0.35)}`,
        boxShadow: `0 10px 30px ${alpha(brand[400], 0.14)}`,
        transition: 'transform 0.18s ease, box-shadow 0.18s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: `0 14px 38px ${alpha(brand[400], 0.22)}`,
        },
        '@keyframes shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {/* The caption variant is monospaced and this card is the narrow half of
            the hero row, so the label and the fraction each keep their own words
            together and drop onto separate lines when there isn't room. Never
            ellipsis: a truncated "2…" would be a lie about the XP total. */}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="baseline"
          gap={1}
          mb={0.75}
          sx={{ flexWrap: 'wrap' }}
        >
          <Typography
            variant="caption"
            sx={{
              fontWeight: 800,
              fontSize: '0.68rem',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              color: brand[700],
            }}
          >
            {t('xpProgressLabel')}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              fontSize: '0.68rem',
              whiteSpace: 'nowrap',
              color: 'text.secondary',
            }}
          >
            {current} / {needed}
          </Typography>
        </Stack>

        <LinearProgress
          variant="determinate"
          value={pct}
          sx={{
            height: 12,
            borderRadius: 6,
            bgcolor: alpha(brand[200], 0.5),
            '& .MuiLinearProgress-bar': {
              borderRadius: 6,
              background: `linear-gradient(90deg, ${brand[400]}, ${accent[400]}, ${brand[300]}, ${accent[400]}, ${brand[400]})`,
              backgroundSize: '200% 100%',
              animation: 'shimmer 3s ease-in-out infinite',
              transition: 'width 0.6s ease',
            },
          }}
        />

        <Typography
          variant="body2"
          sx={{ color: brand[700], fontWeight: 700, fontSize: '0.82rem', mt: 1, display: 'block' }}
        >
          {t('xpToLevel', { xp: needed - current, level: level + 1 })}
        </Typography>

        <Box sx={{ mt: 1.25, pt: 1.25, borderTop: `1px solid ${alpha(brand[300], 0.3)}` }}>
          <Stack direction="row" alignItems="center" spacing={0.5} mb={nextItem ? 0.5 : 0}>
            <AutoAwesomeIcon sx={{ fontSize: '0.9rem', color: accent[500], flexShrink: 0 }} />
            <Typography
              variant="body2"
              sx={{ fontWeight: 800, fontSize: '0.82rem', color: accent[600] }}
            >
              {t('xpToSpend', { xp: spendableXp.toLocaleString() })}
            </Typography>
            <StorefrontIcon
              sx={{ fontSize: '0.9rem', color: brand[500], ml: 'auto', flexShrink: 0 }}
            />
          </Stack>
          {nextItem && xpNeeded > 0 && (
            <Typography
              variant="caption"
              sx={{ color: 'text.secondary', fontWeight: 600, display: 'block' }}
            >
              {nextItem.emoji} {nextItem.name} — {t('moreXp', { xp: xpNeeded.toLocaleString() })}
            </Typography>
          )}
        </Box>
      </Box>

      <LevelBadge level={level} size={84} />
    </Box>
  );
}
