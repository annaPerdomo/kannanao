'use client';
import FaceRetouchingNaturalIcon from '@mui/icons-material/FaceRetouchingNatural';
import StorefrontIcon from '@mui/icons-material/Storefront';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Loading } from '@/components/Loading';
import { StyledDialog } from '@/components/StyledDialog';
import { UserAvatar } from '@/components/UserAvatar';
import { useAuth } from '@/contexts/AuthContext';
import { useShopCtx } from '@/contexts/ShopContext';
import { SHOP_ITEMS } from '@/hooks/useShop';
import { BUDDY_ART, BUDDY_FACE_COUNT, buddyFaceSrc, makeAvatar } from '@/lib/buddies';

const BUDDY_ITEMS = SHOP_ITEMS.filter(
  (i) => i.category === 'study_buddy' && !i.comingSoon && BUDDY_ART[i.key],
);

const FACE_VARIANTS = Array.from({ length: BUDDY_FACE_COUNT }, (_, i) => i + 1);

interface AvatarPickerDialogProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Pick a buddy face as your avatar. Owning a buddy in the shop is what unlocks
 * its faces — there's nothing to buy here, which is also why the locked ones
 * aren't shown: the shop is where buddies are browsed and bought.
 */
export function AvatarPickerDialog({ open, onClose }: AvatarPickerDialogProps) {
  const t = useTranslations('AvatarPicker');
  const tCommon = useTranslations('Common');
  const tShop = useTranslations('Shop.items');
  const router = useRouter();
  const { brand } = useTheme().palette;
  const { avatar, updateAvatar, displayName, user } = useAuth();
  const { ownsItem, loading: shopLoading, error: shopError } = useShopCtx();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ownedBuddies = BUDDY_ITEMS.filter((i) => ownsItem(i.key));
  const hasLockedBuddies = ownedBuddies.length < BUDDY_ITEMS.length;
  const myName = displayName ?? user?.email?.split('@')[0] ?? '';

  // Optimistic: the ring (and every avatar on screen) moves instantly; on
  // failure AuthContext rolls back and the alert says why.
  const select = async (value: string | null) => {
    if (saving || value === avatar) return;
    setSaving(true);
    setError(null);
    const { error: err } = await updateAvatar(value);
    setSaving(false);
    if (err) setError(err);
  };

  const faceButton = (selected: boolean) => ({
    width: 52,
    height: 52,
    borderRadius: '50%',
    bgcolor: '#fff',
    border: `2.5px solid ${selected ? brand[600] : alpha(brand[300], 0.4)}`,
    boxShadow: selected ? `0 0 0 3px ${alpha(brand[400], 0.3)}` : 'none',
    transition: 'transform 0.15s ease, border-color 0.15s ease',
    '&:hover': { transform: 'scale(1.12)' },
  });

  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      title={t('title')}
      subtitle={t('subtitle')}
      icon={<FaceRetouchingNaturalIcon sx={{ color: brand[600], fontSize: 22 }} />}
      titleId="avatar-picker-title"
      maxWidth="xs"
      actions={
        <Button variant="contained" onClick={onClose} disabled={saving}>
          {tCommon('done')}
        </Button>
      }
    >
      <Stack spacing={2}>
        {error && <Alert severity="error">{error}</Alert>}

        {/* Which buddies are owned comes from the shop, which is fetched
            client-side. Rendering the list early would show an empty picker and
            claim the user owns nothing. */}
        {shopLoading ? (
          <Loading message={tCommon('loading')} />
        ) : shopError ? (
          <Alert severity="error">{t('loadError')}</Alert>
        ) : (
          <>
            {/* No avatar — the classic initial circle */}
            <ButtonBase
              onClick={() => void select(null)}
              disabled={saving}
              aria-pressed={avatar === null}
              sx={{
                justifyContent: 'flex-start',
                gap: 1.5,
                p: 1,
                borderRadius: 2.5,
                border: `2px solid ${avatar === null ? brand[600] : alpha(brand[300], 0.35)}`,
                bgcolor: avatar === null ? alpha(brand[100], 0.6) : 'transparent',
              }}
            >
              <UserAvatar name={myName} size={44} />
              <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: brand[700] }}>
                {t('useInitial')}
              </Typography>
            </ButtonBase>

            {ownedBuddies.map((item) => (
              <Box key={item.key}>
                <Typography
                  sx={{ fontWeight: 800, fontSize: '0.8rem', color: brand[700], mb: 0.75 }}
                >
                  {tShop(`${item.key}.name`)}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {FACE_VARIANTS.map((v) => {
                    const value = makeAvatar(item.key, v);
                    const selected = avatar === value;
                    return (
                      <ButtonBase
                        key={v}
                        onClick={() => void select(value)}
                        disabled={saving}
                        aria-pressed={selected}
                        aria-label={t('faceAriaLabel', {
                          name: tShop(`${item.key}.name`),
                          number: v,
                        })}
                        sx={faceButton(selected)}
                      >
                        <Box
                          component="img"
                          src={buddyFaceSrc(item.key, v)}
                          alt=""
                          loading="lazy"
                          sx={{ width: '84%', height: '84%', objectFit: 'contain' }}
                        />
                      </ButtonBase>
                    );
                  })}
                </Box>
              </Box>
            ))}

            {hasLockedBuddies && (
              <Button
                startIcon={<StorefrontIcon />}
                onClick={() => {
                  onClose();
                  router.push('/shop');
                }}
                sx={{ fontWeight: 700, textTransform: 'none', color: brand[700] }}
              >
                {t('shopLink')}
              </Button>
            )}
          </>
        )}
      </Stack>
    </StyledDialog>
  );
}
