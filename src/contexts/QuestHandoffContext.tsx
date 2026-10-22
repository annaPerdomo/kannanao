'use client';
import { createContext, type ReactNode, useContext } from 'react';

import type { ChainMode } from '@/lib/practiceChain';

/** The next action an end-of-session screen offers inside a quest. */
export interface QuestHandoff {
  label: string;
  onNext: () => void;
  /**
   * Leave mid-chain. The finish screens sit above the nav and the header's back
   * button, so without this the only way out is the system back gesture.
   */
  onStop: () => void;
  final?: boolean;
  /** The next game's chrome for a progress card; null on the final hand-off. */
  next?: { mode: ChainMode; emoji: string; description: string } | null;
  progress?: { done: number; total: number };
}

const QuestHandoffCtx = createContext<QuestHandoff | null>(null);

/**
 * Context rather than a prop because every practice mode renders its own finish
 * screen: this replaces that screen's one button without any mode component
 * knowing quests exist. It is also what separates "the session finished" from
 * "the learner backed out" — `onExit` is shared by both, but only the finish
 * screen calls the handoff.
 */
export function QuestHandoffProvider({
  value,
  children,
}: {
  value: QuestHandoff | null;
  children: ReactNode;
}) {
  return <QuestHandoffCtx.Provider value={value}>{children}</QuestHandoffCtx.Provider>;
}

export function useQuestHandoff(): QuestHandoff | null {
  return useContext(QuestHandoffCtx);
}
