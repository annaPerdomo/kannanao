'use client';

import { useEffect } from 'react';

import { sb } from '@/lib/supabase';

// Belt-and-suspenders for the "logged-in user sees the marketing landing at /"
// bug. The primary fix is the login page's full-document navigation, but a
// signed-in user can still land on the Router-Cache-stale (or bfcache-restored)
// static landing payload at `/` within the 5-minute staleTime window. When that
// happens, reload once so the middleware re-decides and serves the dynamic
// dashboard instead.
//
// This lives in a `'use client'` component (never the landing's server tree) so
// the landing page stays statically prerendered — it reads no cookies/headers
// on the server.
const RELOAD_GUARD_KEY = 'kannanao-landing-auth-reload';

function reloadOnce() {
  // Only ever reload once per tab session to avoid any chance of a reload loop
  // (e.g. if the middleware kept serving the landing for a misconfigured
  // request). In the normal case the reload lands on the dashboard route, so
  // this component never re-mounts anyway.
  try {
    if (sessionStorage.getItem(RELOAD_GUARD_KEY)) return;
    sessionStorage.setItem(RELOAD_GUARD_KEY, '1');
  } catch {
    // sessionStorage unavailable (private mode edge cases) — skip the guard
    // rather than risk a loop; just bail without reloading.
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

    // Check the current session on mount (covers bfcache/router-cache restores
    // where the session already exists) …
    sb.auth.getSession().then(({ data }) => maybeReload(!!data.session));

    // … and react to a session appearing while the landing is on screen.
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
