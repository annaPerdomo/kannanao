'use client';

import { createContext, type ReactNode, useContext } from 'react';

import { useProgress } from '@/hooks/useProgress';
import type { InitialProgress } from '@/lib/dbMappers';

type ProgressContextValue = ReturnType<typeof useProgress>;

const noop = () => {};
const noopAsync = async () => {};

const ProgressCtx = createContext<ProgressContextValue>({
  progress: null,
  spendableXp: 0,
  achievements: [],
  recentSessions: [],
  loading: true,
  newlyUnlocked: [],
  clearNewlyUnlocked: noop,
  recordAnswer: noopAsync,
  endSession: noopAsync,
  startSession: async () => '',
  addBonusXp: noopAsync,
  openDailyChest: async () => false,
  refetch: noopAsync,
});

export function ProgressProvider({
  children,
  initialProgress,
}: {
  children: ReactNode;
  initialProgress?: InitialProgress | null;
}) {
  const value = useProgress(initialProgress);
  return <ProgressCtx.Provider value={value}>{children}</ProgressCtx.Provider>;
}

export function useProgressCtx(): ProgressContextValue {
  return useContext(ProgressCtx);
}
