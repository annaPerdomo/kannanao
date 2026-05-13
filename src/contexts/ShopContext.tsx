'use client';

import { createContext, type ReactNode, useContext } from 'react';

import { useShop } from '@/hooks/useShop';

type ShopContextValue = ReturnType<typeof useShop>;

const noopAsync = async () => ({ error: null });

const ShopCtx = createContext<ShopContextValue>({
  purchases: [],
  equipped: {},
  loading: true,
  error: null,
  ownsItem: () => false,
  purchaseItem: noopAsync,
  equipItem: noopAsync,
  unequipItem: noopAsync,
  refetch: async () => {},
});

export function ShopProvider({ children }: { children: ReactNode }) {
  const value = useShop();
  return <ShopCtx.Provider value={value}>{children}</ShopCtx.Provider>;
}

export function useShopCtx(): ShopContextValue {
  return useContext(ShopCtx);
}
