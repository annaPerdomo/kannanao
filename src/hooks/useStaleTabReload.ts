'use client';

import { useEffect, useRef } from 'react';

const STALE_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour

/**
 * Reloads the page when the user returns to the tab after being away
 * for longer than the stale threshold (1 hour).
 */
export function useStaleTabReload() {
  const hiddenAtRef = useRef<number | null>(null);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.hidden) {
        hiddenAtRef.current = Date.now();
      } else if (hiddenAtRef.current) {
        const elapsed = Date.now() - hiddenAtRef.current;
        hiddenAtRef.current = null;
        if (elapsed >= STALE_THRESHOLD_MS) {
          window.location.reload();
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);
}
