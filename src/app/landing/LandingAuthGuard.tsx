'use client';

import { useEffect } from 'react';

import { sb } from '@/lib/supabase';

// Reload once if a session appears while the landing is at /
// (prevents signed-in users from seeing the Router-Cache stale landing).
// Must stay client-only so the landing stays statically prerendered.
const RELOAD_GUARD_KEY = 'kannanao-landing-auth-reload';

function reloadOnce() {
  try {
    if (sessionStorage.getItem(RELOAD_GUARD_KEY)) return;
    sessionStorage.setItem(RELOAD_GUARD_KEY, '1');
  } catch {
    return;
  }
  window.location.reload();
}

export default function LandingAuthGuard() {
  useEffect(() => {
    let cancelled = false;

    const maybeReload = (hasSession: boolean) => {
      if (cancelled) return;
      if (hasSession && window.location.pathname === '/') {
        reloadOnce();
      }
    };

    sb.auth.getSession().then(({ data }) => maybeReload(!!data.session));

    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      maybeReload(!!session);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return null;
}
