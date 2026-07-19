'use client';
import { createContext, useCallback, useContext, useState } from 'react';

export type BuddyReaction = 'correct' | 'wrong' | 'idle';

interface BuddyReactionEvent {
  key: number;
  reaction: BuddyReaction;
}

interface BuddyReactionContextValue {
  reactionEvent: BuddyReactionEvent | null;
  triggerReaction: (reaction: BuddyReaction) => void;
}

const BuddyReactionContext = createContext<BuddyReactionContextValue>({
  reactionEvent: null,
  triggerReaction: () => {},
});

let nextKey = 0;

/**
 * There is exactly one buddy widget in the app (the global shop-equipped one,
 * rendered once via GlobalBuddy). Practice/study screens don't render their
 * own buddy — they call `triggerReaction` here to make the global one react.
 * Each call gets a fresh key so the same reaction fired twice in a row still
 * re-triggers the animation.
 */
export function BuddyReactionProvider({ children }: { children: React.ReactNode }) {
  const [reactionEvent, setReactionEvent] = useState<BuddyReactionEvent | null>(null);

  const triggerReaction = useCallback((reaction: BuddyReaction) => {
    setReactionEvent({ key: ++nextKey, reaction });
  }, []);

  return (
    <BuddyReactionContext.Provider value={{ reactionEvent, triggerReaction }}>
      {children}
    </BuddyReactionContext.Provider>
  );
}

export function useBuddyReaction() {
  return useContext(BuddyReactionContext);
}
