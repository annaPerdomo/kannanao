'use client';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';

import { DEFAULT_LOCALE, DEFAULT_TIME_ZONE } from '@/i18n/config';
import enMessages from '@/messages/en.json';

/**
 * An intl provider for routes that must stay statically prerendered.
 *
 * The 'use client' directive is the entire point. Imported from a Server
 * Component, `NextIntlClientProvider` resolves to next-intl's `react-server`
 * build, which awaits getFormats() and getConfigNow() even when you pass
 * `locale`/`messages` yourself — and those read the locale cookie, which
 * silently turns the route dynamic. Crossing a client boundary first resolves
 * the plain react-client provider instead, which touches no server APIs.
 *
 * Locale is hardcoded English: these routes render before we know who the user
 * is. The cookie-driven locale lives in the (app) route group, which is already
 * per-request. Keep it that way — see CLAUDE.md's route-groups section.
 */
export function StaticIntlProvider({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider
      locale={DEFAULT_LOCALE}
      messages={enMessages}
      timeZone={DEFAULT_TIME_ZONE}
    >
      {children}
    </NextIntlClientProvider>
  );
}
