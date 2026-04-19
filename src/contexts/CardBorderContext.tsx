'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useShop, CARD_BORDER_STYLES } from '@/hooks/useShop';
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
  const { equipped } = useShop();
  const equippedBorderKey = equipped.card_border ?? null;
  const borderStyle = equippedBorderKey
    ? (CARD_BORDER_STYLES[equippedBorderKey] ?? {})
    : {};

  return (
    <CardBorderCtx.Provider value={{ borderStyle, equippedBorderKey }}>
      {children}
    </CardBorderCtx.Provider>
  );
}

export function useCardBorder() {
  return useContext(CardBorderCtx);
}
