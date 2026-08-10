'use client';

import { createContext, type ReactNode, useContext } from 'react';

import { useBuddyFriendship } from '@/hooks/useBuddyFriendship';

type BuddyFriendshipContextValue = ReturnType<typeof useBuddyFriendship>;

const BuddyFriendshipCtx = createContext<BuddyFriendshipContextValue>({
  friendships: {},
  equipped: null,
  loading: true,
  error: null,
  awardFriendship: async () => null,
  petBuddy: async () => null,
  canPetToday: false,
  levelUpEvent: null,
  clearLevelUpEvent: () => {},
  ensureLoaded: async () => {},
  refetch: async () => {},
});

/**
 * Mounted once, app-wide: the hook holds the session-end subscription that pays
 * hearts, so a second instance would double-award.
 */
export function BuddyFriendshipProvider({ children }: { children: ReactNode }) {
  const value = useBuddyFriendship();
  return <BuddyFriendshipCtx.Provider value={value}>{children}</BuddyFriendshipCtx.Provider>;
}

export function useBuddyFriendshipCtx(): BuddyFriendshipContextValue {
  return useContext(BuddyFriendshipCtx);
}
