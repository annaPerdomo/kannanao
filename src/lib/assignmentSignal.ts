'use client';

/**
 * The completion POST is fired by whichever practice mode just finished; the
 * quest's finish screen — mounted afterwards, in a different tree — is what
 * reports the verdict. This is how that screen waits for the write it is about
 * to read instead of racing it.
 */
export interface AssignmentCompleteSignal {
  /** Assignments the server closed out for the session that just ended. */
  completed: number;
  at: number;
}

let last: AssignmentCompleteSignal | null = null;
const listeners = new Set<(signal: AssignmentCompleteSignal) => void>();

/** Called on every terminal path of `endSession`, including the failures. */
export function publishAssignmentComplete(completed: number): void {
  last = { completed, at: Date.now() };
  for (const fn of listeners) fn(last);
}

export function peekAssignmentComplete(): AssignmentCompleteSignal | null {
  return last;
}

export function onAssignmentComplete(fn: (signal: AssignmentCompleteSignal) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
