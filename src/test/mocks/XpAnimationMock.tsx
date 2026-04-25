import { createContext } from 'react';

interface XpEvent {
  key: number;
  amount: number;
}

interface XpAnimationContextValue {
  pendingXp: XpEvent[];
  triggerXpEarned: (amount: number) => void;
  dismissXpEvent: (key: number) => void;
}

export const XpAnimationContext = createContext<XpAnimationContextValue>({
  pendingXp: [],
  triggerXpEarned: () => {},
  dismissXpEvent: () => {},
});
