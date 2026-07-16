import { cookies } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';

import { DEFAULT_TIME_ZONE, LOCALE_COOKIE, resolveLocale } from './config';
import { messagesFor } from './messages';

// Locale comes from a cookie, not a URL segment — there is no [locale] route
// group, so every existing link, redirect and deep link keeps working.
//
// This runs per request, so it is only ever reached from the (app) route group
// (which is already dynamic). The landing page must never call a next-intl
// server API, or reading this cookie would opt it out of static prerendering —
// it imports messagesFor() directly with a hardcoded locale instead.
export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get(LOCALE_COOKIE)?.value);

  return { locale, messages: messagesFor(locale), timeZone: DEFAULT_TIME_ZONE };
});
