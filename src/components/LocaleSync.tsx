'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { readLocaleCookie, writeLocaleCookie } from '@/i18n/localeCookie';

/**
 * Makes the account's language win over the device's, once, at sign-in.
 *
 * The precedence this implements: an explicit profiles.locale beats the cookie;
 * the cookie (landing toggle / Accept-Language pick) beats the default. A NULL
 * column is not a vote — it means the user has never chosen, so the device keeps
 * whatever it had. That's what lets someone pick 日本語 on the landing, sign up,
 * and stay in Japanese, while someone who chose Japanese *on their account* gets
 * Japanese on a borrowed English laptop.
 *
 * Why a client effect and not the server: NEXT_LOCALE is what src/i18n/request.ts
 * and the middleware both read, and a layout can't set a cookie — only a route
 * handler, server action or middleware can. Resolving the profile inside
 * request.ts instead would mean a profile query on every single request in the
 * (app) group, to correct a disagreement that exists once per device. So the
 * server renders whatever the cookie said, and this corrects it: one extra
 * round-trip on the first load after signing in somewhere new, and never again
 * (the cookie now agrees, so the mismatch is gone).
 *
 * Mounted in the (app) layout only — NOT in Providers. Providers is also
 * rendered by both static landing builds and by the Pages Router shadow routes
 * in src/pages/_app.tsx, where next/navigation's useRouter has no App Router
 * context and throws.
 *
 * Renders nothing.
 */
export function LocaleSync() {
  const { profileLocale } = useAuth();
  const router = useRouter();
  // Guards against a refresh loop. router.refresh() re-renders this tree, and
  // until the server's Set-Cookie-less response comes back the cookie read below
  // can still race the old value; without the latch a mismatch could fire
  // refresh() again on every pass.
  const syncedRef = useRef(false);

  useEffect(() => {
    if (!profileLocale || syncedRef.current) return;
    if (readLocaleCookie() === profileLocale) return;
    syncedRef.current = true;
    writeLocaleCookie(profileLocale);
    router.refresh();
  }, [profileLocale, router]);

  return null;
}
