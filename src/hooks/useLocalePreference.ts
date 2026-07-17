'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useCallback, useState } from 'react';

import { type Locale, resolveLocale } from '@/i18n/config';
import { writeLocaleCookie } from '@/i18n/localeCookie';
import { sb, updateProfileLocale } from '@/lib/supabase';

/**
 * The language picker's persistence: the account row, the cookie, and the
 * re-render, in that order.
 *
 * ORDER IS THE WHOLE DESIGN HERE — profile first, cookie second.
 *
 * The obvious alternative is to write the cookie optimistically and roll it back
 * if the database write fails, which is what updateProfileReviewReminders does
 * next door. That pattern earns its keep there because the switch flips in local
 * React state instantly and the user sees it. It earns nothing here: the locale
 * doesn't come from local state, it comes from the server re-reading the cookie
 * on router.refresh(). So an optimistic cookie buys no visible speed-up, and it
 * costs a window in which the cookie says 'ja' while the account still says 'en'
 * — navigate during that window (or fail the rollback) and the app is speaking a
 * language the account rejected.
 *
 * Writing the fallible thing first collapses that: if the row write fails, the
 * cookie was never touched, there is nothing to roll back, and the UI has not
 * yet claimed anything untrue. The `error` an Alert renders is then the only
 * evidence that anything happened at all — which is exactly right.
 */
export function useLocalePreference() {
  const active = resolveLocale(useLocale());
  const router = useRouter();
  const pathname = usePathname();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const setLocale = useCallback(
    async (next: Locale) => {
      setSaving(true);
      setError(null);
      setSaved(false);

      const {
        data: { user },
      } = await sb.auth.getUser();

      // No early return when `next === active`, deliberately. A user whose
      // profiles.locale is NULL ("never chose — follow the device") and who
      // deliberately picks English is already *seeing* English, so an
      // active-vs-next check would skip the write and leave the column NULL —
      // silently discarding the explicit choice they just made, and letting a
      // Japanese browser override it at the next sign-in. The pick is what we're
      // recording, not the visible change.
      if (user) {
        const { error: writeError } = await updateProfileLocale(user.id, next);
        if (writeError) {
          setError(writeError);
          setSaving(false);
          return;
        }
      }

      writeLocaleCookie(next);
      setSaved(true);
      setSaving(false);

      // Only when it changes anything: refresh() refetches this route's whole
      // server tree, which is pure waste for a no-op re-pick of the current
      // language. The cookie and the row are already written either way.
      if (next !== active) {
        // The landing pages are per-language STATIC routes — refresh() would
        // re-serve the same page in the same language and the switch would
        // silently no-op. Navigate to the new language's canonical URL instead
        // (same pair the landing's own toggle links to).
        if (pathname === '/landing' || pathname?.startsWith('/landing/')) {
          window.location.assign(next === 'ja' ? '/landing/ja' : '/');
          return;
        }
        router.refresh();
      }
    },
    [active, router, pathname],
  );

  return { locale: active, setLocale, saving, error, saved };
}
