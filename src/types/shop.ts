import type { SxProps, Theme } from '@mui/material/styles';

export type ShopCategory = 'theme' | 'card_border';

export interface ShopItem {
  key: string;
  name: string;
  description: string;
  category: ShopCategory;
  price: number;
  preview: string;
  emoji: string;
  comingSoon?: boolean;
}

export interface CardBorderStyle {
  border?: string;
  boxShadow?: string;
  background?: string;
  borderRadius?: string;
}

export interface UserPurchase {
  id: string;
  item_key: string;
  purchased_at: string;
}

export interface UserEquipped {
  id: string;
  slot: string;
  item_key: string;
}
