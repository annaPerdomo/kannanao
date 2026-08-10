'use client';

/**
 * A practice mode ends the session; the friendship provider that pays hearts
 * for it sits in AppShell, an unrelated tree. Module-level (like
 * assignmentSignal) so no practice mode has to know the subscriber exists.
 */
export interface SessionEndSignal {
  cardsStudied: number;
  at: number;
}

const listeners = new Set<(signal: SessionEndSignal) => void>();

/** Called on every terminal path of `endSession`, including the failures. */
export function publishSessionEnd(cardsStudied: number): void {
  const signal = { cardsStudied, at: Date.now() };
  for (const fn of listeners) fn(signal);
}

export function onSessionEnd(fn: (signal: SessionEndSignal) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
