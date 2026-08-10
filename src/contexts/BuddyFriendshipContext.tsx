'use client';

import { usePathname } from 'next/navigation';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react';

import { useBuddyFriendship } from '@/hooks/useBuddyFriendship';
import { isSessionRoute } from '@/lib/sessionRoutes';

export type BuddyStoryRequest =
  // Browsing has no level of its own: the dialog reads it off live hearts.
  { mode: 'browse'; buddyKey: string } | { mode: 'levelUp'; buddyKey: string; level: number };

type BuddyFriendshipContextValue = ReturnType<typeof useBuddyFriendship> & {
  storyRequest: BuddyStoryRequest | null;
  openStories: (buddyKey: string) => void;
  closeStories: () => void;
};

const BuddyFriendshipCtx = createContext<BuddyFriendshipContextValue>({
  friendships: {},
  equipped: null,
  loadState: 'idle',
  loading: false,
  error: null,
  awardFriendship: async () => null,
  petBuddy: async () => null,
  canPetToday: false,
  levelUpEvent: null,
  clearLevelUpEvent: () => {},
  ensureLoaded: async () => {},
  refetch: async () => {},
  storyRequest: null,
  openStories: () => {},
  closeStories: () => {},
});

/**
 * Mounted once, app-wide: the hook holds the session-end subscription that pays
 * hearts, so a second instance would double-award.
 */
export function BuddyFriendshipProvider({ children }: { children: ReactNode }) {
  const friendship = useBuddyFriendship();
  const { levelUpEvent, clearLevelUpEvent } = friendship;
  const pathname = usePathname();
  const [storyRequest, setStoryRequest] = useState<BuddyStoryRequest | null>(null);

  const openStories = useCallback((buddyKey: string) => {
    setStoryRequest({ mode: 'browse', buddyKey });
  }, []);

  const closeStories = useCallback(() => {
    // Only the celebration consumes the event; closing a browse the user
    // opened mid-session must leave a held level-up waiting for them.
    if (storyRequest?.mode === 'levelUp') clearLevelUpEvent();
    setStoryRequest(null);
  }, [storyRequest, clearLevelUpEvent]);

  // A story dialog on top of a running session is the wrong kind of surprise,
  // so the event is left unconsumed until the route change out of one.
  useEffect(() => {
    if (!levelUpEvent || isSessionRoute(pathname)) return;
    setStoryRequest({
      mode: 'levelUp',
      buddyKey: levelUpEvent.buddyKey,
      level: levelUpEvent.level,
    });
  }, [levelUpEvent, pathname]);

  return (
    <BuddyFriendshipCtx.Provider value={{ ...friendship, storyRequest, openStories, closeStories }}>
      {children}
    </BuddyFriendshipCtx.Provider>
  );
}

export function useBuddyFriendshipCtx(): BuddyFriendshipContextValue {
  return useContext(BuddyFriendshipCtx);
}
