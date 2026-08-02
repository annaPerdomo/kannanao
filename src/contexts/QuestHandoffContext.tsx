'use client';
import { createContext, type ReactNode, useContext } from 'react';

/** The single next action an end-of-session screen offers inside a quest. */
export interface QuestHandoff {
  label: string;
  onNext: () => void;
}

const QuestHandoffCtx = createContext<QuestHandoff | null>(null);

/**
 * Supplied by a quest leg's page and read by the end-of-session screens
 * (celebration, quiz result). It exists as context rather than a prop because
 * every practice mode renders its own finish screen: this way a quest replaces
 * that screen's one button without any mode component knowing quests exist.
 *
 * It is also the signal that separates "the session finished" from "the learner
 * backed out" — the modes' `onExit` prop is shared by both, but only the finish
 * screen ever calls the handoff.
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
