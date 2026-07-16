'use client';
import { NextIntlClientProvider } from 'next-intl';
import type { ComponentProps, ReactNode } from 'react';

import { DEFAULT_TIME_ZONE, type Locale } from '@/i18n/config';

type Messages = ComponentProps<typeof NextIntlClientProvider>['messages'];

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
 * Locale and messages are props rather than imports for two reasons. A
 * 'use client' module that imports en.json ships every namespace in the route's
 * JS bundle, so a Server Component caller that hands over only the namespaces
 * its tree renders keeps the rest out of the browser entirely. And the locale
 * has to be the caller's decision: /landing and /landing/ja are two static
 * builds of the same tree, each pinned to its own locale at build time. Neither
 * may derive it from the cookie — the cookie-driven locale lives in the (app)
 * route group, which is already per-request. Keep it that way; see CLAUDE.md's
 * route-groups section.
 */
export function StaticIntlProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Messages;
  children: ReactNode;
}) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone={DEFAULT_TIME_ZONE}>
      {children}
    </NextIntlClientProvider>
  );
}
