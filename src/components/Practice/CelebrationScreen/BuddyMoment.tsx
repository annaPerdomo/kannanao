'use client';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { milestoneMessage } from '@/components/BuddyFriendship';
import { useBuddyFriendshipCtx } from '@/contexts/BuddyFriendshipContext';
import { useShopCtx } from '@/contexts/ShopContext';
import { BUDDY_ART, buddyFaceSrc, resolveBuddyKey } from '@/lib/buddies';
import { HEARTS_PER_DAY } from '@/lib/friendship';

interface BuddyMomentProps {
  textColor: string;
  subTextColor: string;
}

export function BuddyMoment({ textColor, subTextColor }: BuddyMomentProps) {
  const t = useTranslations('Practice.celebration.buddy');
  const tFriendship = useTranslations('Home.buddy.friendship');
  const tItems = useTranslations('Shop.items');
  const tBuddies = useTranslations('Shop.buddies');
  const { brand } = useTheme().palette;
  const { equipped: shopEquipped } = useShopCtx();
  const { equipped, loadState, ensureLoaded, heartsToday, canPetToday, petBuddy } =
    useBuddyFriendshipCtx();
  const [patting, setPatting] = useState(false);
  const [patted, setPatted] = useState(false);

  useEffect(() => {
    void ensureLoaded();
  }, [ensureLoaded]);

  const buddyKey = resolveBuddyKey(shopEquipped['study_buddy']);
  if (loadState !== 'loaded') return null;

  const name = tItems(`${buddyKey}.name`);
  const accent = BUDDY_ART[buddyKey]?.accent ?? textColor;
  let copy: unknown = null;
  try {
    copy = tBuddies.raw(`${buddyKey}.friendship`);
  } catch {
    // buddy without friendship copy — the level crossing is still a real target
  }
  const promise = milestoneMessage(tFriendship, copy, name, equipped?.points ?? 0);

  const pat = () => {
    if (patting || !canPetToday) return;
    setPatting(true);
    petBuddy()
      .then((award) => {
        if (award) setPatted(true);
      })
      .catch(() => {})
      .finally(() => setPatting(false));
  };

  return (
    <Box
      sx={{
        mt: 2,
        p: 1.25,
        borderRadius: 3,
        bgcolor: alpha('#fff', 0.18),
        border: `1.5px solid ${alpha('#fff', 0.35)}`,
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'stretch', sm: 'center' },
        gap: 1.25,
        textAlign: 'left',
        animation: 'fadeUp 0.5s 0.66s ease both',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexGrow: 1, minWidth: 0 }}>
        <Box
          component="img"
          src={buddyFaceSrc(buddyKey, 1)}
          alt=""
          draggable={false}
          sx={{
            width: 46,
            height: 46,
            flexShrink: 0,
            borderRadius: '50%',
            bgcolor: alpha('#fff', 0.92),
            border: `2px solid ${alpha(accent, 0.6)}`,
            objectFit: 'contain',
            p: 0.4,
            animation: patted ? 'buddyWiggle 0.5s ease-in-out' : 'none',
            '@keyframes buddyWiggle': {
              '0%, 100%': { transform: 'rotate(0)' },
              '25%': { transform: 'rotate(-10deg) scale(1.1)' },
              '75%': { transform: 'rotate(10deg) scale(1.1)' },
            },
          }}
        />
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.75 }}>
            <Box sx={{ display: 'flex' }} aria-hidden>
              {Array.from({ length: HEARTS_PER_DAY }, (_, i) =>
                i < heartsToday ? (
                  <FavoriteIcon key={i} sx={{ fontSize: 15, color: brand[400] }} />
                ) : (
                  <FavoriteBorderIcon key={i} sx={{ fontSize: 15, color: subTextColor }} />
                ),
              )}
            </Box>
            <Typography
              sx={{ fontSize: '0.78rem', fontWeight: 800, color: textColor, whiteSpace: 'nowrap' }}
            >
              {t('heartsToday', { earned: heartsToday, total: HEARTS_PER_DAY })}
            </Typography>
          </Box>
          <Typography sx={{ fontSize: '0.8rem', lineHeight: 1.35, color: textColor, mt: 0.25 }}>
            {promise}
          </Typography>
        </Box>
      </Box>
      {patted ? (
        <Typography
          role="status"
          sx={{
            flexShrink: 0,
            textAlign: 'center',
            fontWeight: 900,
            fontSize: '0.95rem',
            color: textColor,
            animation: 'fadeUp 0.4s ease both',
          }}
        >
          {t('patted')}
        </Typography>
      ) : (
        canPetToday && (
          <Button
            size="small"
            variant="contained"
            onClick={pat}
            disabled={patting}
            aria-label={t('patAria', { name })}
            sx={{ flexShrink: 0, fontWeight: 800, whiteSpace: 'nowrap', minHeight: 40 }}
          >
            {t('pat', { name })}
          </Button>
        )
      )}
    </Box>
  );
}
