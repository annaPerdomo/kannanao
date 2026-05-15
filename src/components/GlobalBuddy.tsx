'use client';

import { usePathname } from 'next/navigation';

import { useShopCtx } from '@/contexts/ShopContext';

import { HomeBuddy } from './HomeBuddy';

const HIDE_ON_ROUTES = ['/practice/', '/study', '/login', '/landing', '/embed/', '/notifications'];

export function GlobalBuddy() {
  const pathname = usePathname();
  const { equipped, loading } = useShopCtx();
  const buddyKey = equipped['study_buddy'];

  if (loading || !buddyKey) return null;
  if (HIDE_ON_ROUTES.some((r) => pathname?.includes(r))) return null;

  return <HomeBuddy buddyKey={buddyKey} />;
}
