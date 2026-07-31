'use client';

import { createContext, type ReactNode, useContext } from 'react';

import { useShop } from '@/hooks/useShop';
import type { InitialShop } from '@/lib/dbMappers';

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
  // false = "no server data was read", which is exactly true outside a provider.
  refetch: async () => false,
});

export function ShopProvider({
  children,
  initialShop,
}: {
  children: ReactNode;
  initialShop?: InitialShop | null;
}) {
  const value = useShop(initialShop);
  return <ShopCtx.Provider value={value}>{children}</ShopCtx.Provider>;
}

export function useShopCtx(): ShopContextValue {
  return useContext(ShopCtx);
}
