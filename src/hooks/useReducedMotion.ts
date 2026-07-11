'use client';

import { useEffect, useState } from 'react';

/**
 * True when the user has asked the OS to reduce motion. New celebratory
 * animations (combo chip pop, chest shake) gate on this so they stay calm for
 * anyone who prefers it. SSR-safe: starts false, then syncs on mount.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return reduced;
}
