'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import { alpha } from '@mui/material/styles';
import { CUTE_FONT } from '@/theme';
import type { ShopItem } from '@/types/shop';
import { ShopItemCard } from './ShopItemCard';

export function CategorySection({
  title,
  icon,
  items,
  ownsItem,
  equipped,
  spendableXp,
  onBuy,
  onEquip,
  onPreview,
  brandColor,
  expanded,
  compact,
}: {
  title: string;
  icon: React.ReactNode;
  items: ShopItem[];
  ownsItem: (key: string) => boolean;
  equipped: Record<string, string>;
  spendableXp: number;
  onBuy: (item: ShopItem) => void;
  onEquip: (item: ShopItem) => void;
  onPreview: (item: ShopItem) => void;
  brandColor: string;
  expanded?: boolean;
  compact?: boolean;
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        position: 'relative',
        border: `1.5px solid ${alpha(brandColor, 0.25)}`,
        borderRadius: 3,
        overflow: 'hidden',
        bgcolor: alpha(brandColor, 0.03),
      }}
    >
      <Box
        sx={{
          px: 2.5,
          py: 1.5,
          borderBottom: `1px solid ${alpha(brandColor, 0.15)}`,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        {icon}
        <Typography
          sx={{
            fontFamily: CUTE_FONT,
            fontSize: { xs: '1rem', sm: '1.15rem' },
            color: brandColor,
            fontWeight: 700,
          }}
        >
          {title}
        </Typography>
      </Box>

      <Box
        sx={{
          p: { xs: 1.5, sm: 2 },
          display: 'grid',
          gridTemplateColumns: compact
            ? {
                xs: 'repeat(2, 1fr)',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(2, 1fr)',
                lg: 'repeat(3, 1fr)',
              }
            : expanded
              ? {
                  xs: 'repeat(2, 1fr)',
                  sm: 'repeat(3, 1fr)',
                  md: 'repeat(5, 1fr)',
                  lg: 'repeat(6, 1fr)',
                }
              : {
                  xs: 'repeat(2, 1fr)',
                  sm: 'repeat(3, 1fr)',
                  md: 'repeat(4, 1fr)',
                  lg: 'repeat(5, 1fr)',
                },
          gap: 1.5,
        }}
      >
        {items.map((item) => {
          const owned = ownsItem(item.key);
          const slot = item.category;
          const isEquipped = equipped[slot] === item.key
            || (item.price === 0 && !equipped[slot] && item.key === (slot === 'theme' ? 'theme_sakura' : 'border_none'));

          return (
            <ShopItemCard
              key={item.key}
              item={item}
              owned={owned}
              isEquipped={isEquipped}
              spendableXp={spendableXp}
              onBuy={() => onBuy(item)}
              onEquip={() => onEquip(item)}
              onPreview={() => onPreview(item)}
            />
          );
        })}
      </Box>
    </Paper>
  );
}
