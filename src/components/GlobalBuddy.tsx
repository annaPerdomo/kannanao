'use client';

import { usePathname } from 'next/navigation';

import { useAuth } from '@/contexts/AuthContext';
import { useShopCtx } from '@/contexts/ShopContext';
import { resolveBuddyKey } from '@/lib/buddies';

import { HomeBuddy } from './HomeBuddy';

// There is exactly one buddy in the app — practice/study screens don't
// render their own, they react through BuddyReactionContext instead — so
// this only needs to hide where a buddy makes no sense at all (full-height
// or embedded views). Logged-out visitors never see it: gated on `session`
// below, which also covers the anonymous landing served at `/` (a rewrite,
// so its pathname is `/`, not `/landing`, and a path check would miss it).
const HIDE_ON_ROUTES = ['/login', '/landing', '/embed/', '/notifications'];

export function GlobalBuddy() {
  const pathname = usePathname();
  const { session } = useAuth();
  const { equipped, loading } = useShopCtx();

  if (!session) return null;
  // Hold off until the slot resolves, or a purchased buddy flashes as Tango.
  if (loading) return null;
  if (HIDE_ON_ROUTES.some((r) => pathname?.includes(r))) return null;

  return <HomeBuddy buddyKey={resolveBuddyKey(equipped['study_buddy'])} />;
}
