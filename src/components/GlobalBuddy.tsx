'use client';

import { usePathname } from 'next/navigation';

import { useShop } from '@/hooks/useShop';

import { HomeBuddy } from './HomeBuddy';

const HIDE_ON_ROUTES = ['/practice/', '/study', '/login', '/landing', '/embed/'];

export function GlobalBuddy() {
  const pathname = usePathname();
  const { equipped, loading } = useShop();
  const buddyKey = equipped['study_buddy'];

  if (loading || !buddyKey) return null;
  if (HIDE_ON_ROUTES.some((r) => pathname?.includes(r))) return null;

  return <HomeBuddy buddyKey={buddyKey} />;
}
