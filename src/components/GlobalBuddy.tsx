'use client';

import { usePathname } from 'next/navigation';

import { useShopCtx } from '@/contexts/ShopContext';

import { HomeBuddy } from './HomeBuddy';

// There is exactly one buddy in the app — practice/study screens don't
// render their own, they react through BuddyReactionContext instead — so
// this only needs to hide where a buddy makes no sense at all (logged-out
// or full-height/embedded views).
const HIDE_ON_ROUTES = ['/login', '/landing', '/embed/', '/notifications'];

export function GlobalBuddy() {
  const pathname = usePathname();
  const { equipped, loading } = useShopCtx();
  const buddyKey = equipped['study_buddy'];

  if (loading || !buddyKey) return null;
  if (HIDE_ON_ROUTES.some((r) => pathname?.includes(r))) return null;

  return <HomeBuddy buddyKey={buddyKey} />;
}
