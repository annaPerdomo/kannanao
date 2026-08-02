'use client';
import { createContext, type ReactNode, useContext } from 'react';

/** The single next action an end-of-session screen offers inside a quest. */
export interface QuestHandoff {
  label: string;
  onNext: () => void;
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
