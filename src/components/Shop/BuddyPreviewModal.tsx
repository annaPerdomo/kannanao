'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

import { FriendshipMeter } from '@/components/FriendshipMeter';
import { UserAvatar } from '@/components/UserAvatar';
import { useBuddyFriendshipCtx } from '@/contexts/BuddyFriendshipContext';
import { useShopCtx } from '@/contexts/ShopContext';
import {
  BUDDY_ART,
  BUDDY_FACE_COUNT,
  buddyShopSrc,
  FALLBACK_REACTIONS,
  makeAvatar,
} from '@/lib/buddies';
import type { ShopItem } from '@/types/shop';

function isNonEmptyStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.every((v) => typeof v === 'string');
}

export function BuddyPreviewModal({
  open,
  onClose,
  item,
}: {
  open: boolean;
  onClose: () => void;
  item: ShopItem | null;
}) {
  const t = useTranslations('Shop');
  const tItems = useTranslations('Shop.items');
  const tBuddies = useTranslations('Shop.buddies');
  const theme = useTheme();
  const { brand, surfaces } = theme.palette;
  const { ownsItem } = useShopCtx();
  const { friendships, ensureLoaded } = useBuddyFriendshipCtx();
  const owned = !!item && ownsItem(item.key);

  // Friendship rows are lazy — load them only when an owned buddy's row will
  // actually render.
  useEffect(() => {
    if (open && owned) void ensureLoaded();
  }, [open, owned, ensureLoaded]);

  if (!item || !BUDDY_ART[item.key]) return null;

  let greetingLines = FALLBACK_REACTIONS.idle;
  try {
    const raw = tBuddies.raw(`${item.key}.idle`);
    if (isNonEmptyStringArray(raw)) greetingLines = raw;
  } catch {
    // missing translation set — keep the generic fallback
  }
  const { accent, bg } = BUDDY_ART[item.key];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 4,
            overflow: 'hidden',
            bgcolor: surfaces.overlay,
            border: `2px solid ${alpha(brand[300], 0.35)}`,
            boxShadow: `0 12px 48px ${alpha(brand[700], 0.18)}`,
          },
        },
      }}
    >
      <Box
        sx={{
          background: `radial-gradient(ellipse at 50% 100%, ${alpha(accent, 0.22)} 0%, ${bg} 70%)`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1.5,
          px: 3,
          pt: 2.5,
          pb: 3,
        }}
      >
        <Box
          sx={{
            bgcolor: alpha('#fff', 0.92),
            border: `1.5px solid ${alpha(brand[300], 0.4)}`,
            borderRadius: 3,
            px: 2,
            py: 0.75,
            maxWidth: 240,
            boxShadow: `0 4px 16px ${alpha(brand[400], 0.15)}`,
          }}
        >
          <Typography
            sx={{
              fontSize: '0.85rem',
              fontWeight: 600,
              color: 'text.primary',
              textAlign: 'center',
            }}
          >
            {greetingLines[0]}
          </Typography>
        </Box>

        <Box
          component="img"
          src={buddyShopSrc(item.key)}
          alt=""
          draggable={false}
          sx={{
            height: 140,
            maxWidth: '70%',
            objectFit: 'contain',
            pointerEvents: 'none',
            filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.12))',
          }}
        />

        <Typography
          sx={{
            fontFamily: (muiTheme) => muiTheme.fonts.cute,
            fontSize: '1.35rem',
            color: brand[700],
            lineHeight: 1.2,
          }}
        >
          {tItems(`${item.key}.name`)}
        </Typography>
        <Typography
          sx={{ fontSize: '0.82rem', color: 'text.primary', textAlign: 'center', lineHeight: 1.5 }}
        >
          {tItems(`${item.key}.description`)}
        </Typography>
      </Box>

      {/* Owned buddies only: no teasing locked mechanics in the shop */}
      {owned && (
        <Box
          sx={{
            px: 3,
            py: 2,
            borderTop: `1px solid ${alpha(brand[300], 0.3)}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: brand[700] }}>
            {t('buddyPreview.friendshipLabel')}
          </Typography>
          <FriendshipMeter points={friendships[item.key]?.points ?? 0} size="small" />
        </Box>
      )}

      {/* The other half of the purchase: every face is a profile picture */}
      <Box
        sx={{
          px: 3,
          py: 2.5,
          borderTop: `1px solid ${alpha(brand[300], 0.3)}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        <Typography
          sx={{ fontSize: '0.82rem', fontWeight: 700, color: brand[700], textAlign: 'center' }}
        >
          {t('buddyPreview.avatarPerk')}
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 0.75 }}>
          {Array.from({ length: BUDDY_FACE_COUNT }, (_, i) => (
            <UserAvatar key={i} avatar={makeAvatar(item.key, i + 1)} name="" size={40} />
          ))}
        </Box>
      </Box>

      <DialogActions
        sx={{ justifyContent: 'center', py: 2, borderTop: `1px solid ${alpha(brand[300], 0.3)}` }}
      >
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{ borderRadius: 2, px: 4, fontFamily: (muiTheme) => muiTheme.fonts.cute }}
        >
          {t('buddyPreview.close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
