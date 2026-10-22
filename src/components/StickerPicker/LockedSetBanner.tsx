'use client';

import StorefrontIcon from '@mui/icons-material/Storefront';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';

import { SHOP_ITEMS } from '@/hooks/useShop';

interface LockedSetBannerProps {
  buddyKey: string;
  onClose: () => void;
}

export function LockedSetBanner({ buddyKey, onClose }: LockedSetBannerProps) {
  const { brand } = useTheme().palette;
  const t = useTranslations('Messages.stickerPicker');
  const tShop = useTranslations('Shop.items');
  const locale = useLocale();
  const router = useRouter();
  const price = SHOP_ITEMS.find((i) => i.key === buddyKey)?.price;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 1.25,
        py: 1,
        borderRadius: 2.5,
        bgcolor: 'background.paper',
        border: `1.5px solid ${alpha(brand[300], 0.5)}`,
      }}
    >
      <Typography sx={{ flex: 1, fontSize: '0.8rem', fontWeight: 700, color: 'text.primary' }}>
        {t('lockedHint', { name: tShop(`${buddyKey}.name`) })}
      </Typography>
      {price !== undefined && (
        <Button
          size="small"
          variant="contained"
          startIcon={<StorefrontIcon />}
          onClick={() => {
            onClose();
            router.push('/shop');
          }}
          sx={{ flexShrink: 0, textTransform: 'none', fontWeight: 700 }}
        >
          {t('unlockCta', { price: price.toLocaleString(locale) })}
        </Button>
      )}
    </Box>
  );
}
