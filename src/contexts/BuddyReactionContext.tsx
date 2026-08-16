'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

import { onSessionEnd } from '@/lib/sessionSignal';

export type BuddyReaction = 'correct' | 'wrong' | 'idle' | 'comeback';

interface BuddyReactionEvent {
  key: number;
  reaction: BuddyReaction;
}

interface BuddyReactionContextValue {
  reactionEvent: BuddyReactionEvent | null;
  triggerReaction: (reaction: BuddyReaction, cardId?: string) => void;
  markMissed: (cardId: string) => void;
}

const BuddyReactionContext = createContext<BuddyReactionContextValue>({
  reactionEvent: null,
  triggerReaction: () => {},
  markMissed: () => {},
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
  const missedCardsRef = useRef(new Set<string>());

  const markMissed = useCallback((cardId: string) => {
    missedCardsRef.current.add(cardId);
  }, []);

  // A 'correct' on a card missed earlier upgrades to a single 'comeback' — the
  // delete, not a has(), is what caps it at once per card.
  const triggerReaction = useCallback((reaction: BuddyReaction, cardId?: string) => {
    let emitted = reaction;
    if (cardId) {
      if (reaction === 'wrong') missedCardsRef.current.add(cardId);
      else if (reaction === 'correct' && missedCardsRef.current.delete(cardId))
        emitted = 'comeback';
    }
    setReactionEvent({ key: ++nextKey, reaction: emitted });
  }, []);

  useEffect(
    () =>
      onSessionEnd(() => {
        missedCardsRef.current.clear();
      }),
    [],
  );

  return (
    <BuddyReactionContext.Provider value={{ reactionEvent, triggerReaction, markMissed }}>
      {children}
    </BuddyReactionContext.Provider>
  );
}

export function useBuddyReaction() {
  return useContext(BuddyReactionContext);
}
