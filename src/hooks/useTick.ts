'use client';
import { useEffect, useState } from 'react';

/**
 * Returns a counter that increments every `intervalMs` milliseconds.
 * Use as a dependency to force periodic re-renders (e.g. for relative timestamps).
 */
export function useTick(intervalMs = 30_000): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return tick;
}
