'use client';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import { useEffect, useState } from 'react';

const RELOAD_FLAG = 'kannanao:chunk-reloaded';

/**
 * Detects the errors thrown when the browser can't load a JS/CSS chunk — the
 * signature of a stale-cache-after-deploy failure, where the cached HTML shell
 * references chunk filenames that no longer exist on the server.
 */
export function isChunkLoadError(message: string): boolean {
  return (
    /ChunkLoadError/i.test(message) ||
    /Loading chunk [\w-]+ failed/i.test(message) ||
    /Loading CSS chunk/i.test(message) ||
    /(dynamically )?imported module/i.test(message)
  );
}

/**
 * Two safeguards against blank screens caused by a stale service worker after a
 * deploy:
 *
 * 1. Self-heal — if a chunk fails to load, force one hard reload to pull the
 *    fresh HTML shell + matching chunks. Guarded so it reloads at most once per
 *    tab session (no reload loops during a real outage).
 * 2. Soft prompt — when a new service worker has installed, offer the user a
 *    Reload button instead of silently leaving them on the old version.
 */
export function UpdatePrompt() {
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    function handle(message: string) {
      if (!isChunkLoadError(message)) return;
      if (sessionStorage.getItem(RELOAD_FLAG)) return;
      sessionStorage.setItem(RELOAD_FLAG, '1');
      window.location.reload();
    }
    function onError(e: ErrorEvent) {
      handle(e.message || e.error?.message || '');
    }
    function onRejection(e: PromiseRejectionEvent) {
      const reason = e.reason;
      handle(typeof reason === 'string' ? reason : (reason?.message ?? ''));
    }
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    let cancelled = false;

    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg || cancelled) return;
      if (reg.waiting) setUpdateReady(true);
      reg.addEventListener('updatefound', () => {
        const installing = reg.installing;
        if (!installing) return;
        installing.addEventListener('statechange', () => {
          // A worker reaching "installed" while one already controls the page
          // means a newer version is ready.
          if (installing.state === 'installed' && navigator.serviceWorker.controller) {
            setUpdateReady(true);
          }
        });
      });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!updateReady) return null;

  return (
    <Snackbar
      open
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      message="A new version is available"
      action={
        <Button color="secondary" size="small" onClick={() => window.location.reload()}>
          Reload
        </Button>
      }
    />
  );
}
