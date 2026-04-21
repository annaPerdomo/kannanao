import type { SxProps, Theme } from '@mui/material/styles';

export type ShopCategory = 'theme' | 'card_border' | 'celebration' | 'study_buddy';

export interface CelebTheme {
  colors: string[];
  emojis: string[];
}

export interface ShopItem {
  key: string;
  name: string;
  description: string;
  category: ShopCategory;
  price: number;
  preview?: string;
  emoji: string;
  comingSoon?: boolean;
}

export interface BuddyReactions {
  correct: string | string[];
  wrong: string | string[];
  idle: string | string[];
}

export interface BuddyConfig {
  emoji: string;
  reactions: BuddyReactions;
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
