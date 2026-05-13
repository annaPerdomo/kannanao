'use client';

import { createContext, type ReactNode, useContext } from 'react';

import { useShopCtx } from '@/contexts/ShopContext';
import { CARD_BORDER_STYLES } from '@/hooks/useShop';
import type { CardBorderStyle } from '@/types/shop';

interface CardBorderContextValue {
  borderStyle: CardBorderStyle;
  equippedBorderKey: string | null;
}

export const CardBorderCtx = createContext<CardBorderContextValue>({
  borderStyle: {},
  equippedBorderKey: null,
});

export function CardBorderProvider({ children }: { children: ReactNode }) {
  const { equipped } = useShopCtx();
  const equippedBorderKey = equipped.card_border ?? null;
  const borderStyle = equippedBorderKey ? (CARD_BORDER_STYLES[equippedBorderKey] ?? {}) : {};

  return (
    <CardBorderCtx.Provider value={{ borderStyle, equippedBorderKey }}>
      {children}
    </CardBorderCtx.Provider>
  );
}

export function useCardBorder() {
  return useContext(CardBorderCtx);
}
