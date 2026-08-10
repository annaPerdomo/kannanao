'use client';

/**
 * A practice mode ends the session; the friendship provider that pays hearts
 * for it is mounted in AppShell, an unrelated tree with no way to observe that
 * call. This is the seam between them — same shape as assignmentSignal, and
 * kept module-level so no practice mode has to know the subscriber exists.
 */
export interface SessionEndSignal {
  /** Cards graded in the session that just ended. */
  cardsStudied: number;
  at: number;
}

let last: SessionEndSignal | null = null;
const listeners = new Set<(signal: SessionEndSignal) => void>();

/** Called on every terminal path of `endSession`, including the failures. */
export function publishSessionEnd(cardsStudied: number): void {
  last = { cardsStudied, at: Date.now() };
  for (const fn of listeners) fn(last);
}

export function peekSessionEnd(): SessionEndSignal | null {
  return last;
}

export function onSessionEnd(fn: (signal: SessionEndSignal) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
