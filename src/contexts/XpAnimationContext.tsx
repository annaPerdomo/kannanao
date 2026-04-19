'use client';
import { createContext, useCallback, useContext, useState } from 'react';

interface XpEvent {
  key: number;
  amount: number;
}

interface XpAnimationContextValue {
  pendingXp: XpEvent[];
  triggerXpEarned: (amount: number) => void;
  dismissXpEvent: (key: number) => void;
}

const XpAnimationContext = createContext<XpAnimationContextValue>({
  pendingXp: [],
  triggerXpEarned: () => {},
  dismissXpEvent: () => {},
});

let nextKey = 0;

export function XpAnimationProvider({ children }: { children: React.ReactNode }) {
  const [pendingXp, setPendingXp] = useState<XpEvent[]>([]);

  const triggerXpEarned = useCallback((amount: number) => {
    const key = ++nextKey;
    setPendingXp((prev) => [...prev, { key, amount }]);
    setTimeout(() => {
      setPendingXp((prev) => prev.filter((e) => e.key !== key));
    }, 2000);
  }, []);

  const dismissXpEvent = useCallback((key: number) => {
    setPendingXp((prev) => prev.filter((e) => e.key !== key));
  }, []);

  return (
    <XpAnimationContext.Provider value={{ pendingXp, triggerXpEarned, dismissXpEvent }}>
      {children}
    </XpAnimationContext.Provider>
  );
}

export function useXpAnimation() {
  return useContext(XpAnimationContext);
}