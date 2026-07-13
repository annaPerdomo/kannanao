import deepmerge from 'deepmerge';
import { cookies } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';

import en from '@/messages/en.json';
import ja from '@/messages/ja.json';

import { DEFAULT_LOCALE, DEFAULT_TIME_ZONE, LOCALE_COOKIE, resolveLocale } from './config';

type Messages = typeof en;

// Locale comes from a cookie, not a URL segment — there is no [locale] route
// group, so every existing link, redirect and deep link keeps working.
//
// This runs per request, so it is only ever reached from the (app) route group
// (which is already dynamic). The landing page must never call a next-intl
// server API, or reading this cookie would opt it out of static prerendering.
export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get(LOCALE_COOKIE)?.value);

  // English is the source of truth for keys. Merging the locale's messages on
  // top of it means any key that hasn't been translated yet renders its English
  // copy instead of throwing — which is what lets us ship extraction (which
  // lands first) ahead of translation.
  const messages =
    locale === DEFAULT_LOCALE ? en : deepmerge<Messages>(en, ja as Partial<Messages>);

  return { locale, messages, timeZone: DEFAULT_TIME_ZONE };
});
