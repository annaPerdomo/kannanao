import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { Suspense } from 'react';

import { AppBackground } from '@/components/AppBackground';
import { AppShell } from '@/components/AppShell';
import { LocaleHtmlLang } from '@/components/LocaleHtmlLang';
import { getInitialAppData } from '@/lib/serverData';

import Providers from '../providers';
import AppBootSkeleton from './_components/AppBootSkeleton';

// The data-dependent provider tree. It awaits the shell-critical data (auth +
// unread badge count), but because it's rendered inside a <Suspense> boundary
// below, that await streams instead of blocking the whole document — the HTML
// shell + boot skeleton flush immediately and this swaps in when ready.
//
// The intl provider belongs here too: getLocale/getMessages read the locale
// cookie, and this group is already per-request, so it costs nothing new.
async function AppRoot({ children }: { children: React.ReactNode }) {
  const [appData, locale, messages] = await Promise.all([
    getInitialAppData(),
    getLocale(),
    getMessages(),
  ]);

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <LocaleHtmlLang />
      <Providers initialAuth={appData.auth}>
        <AppBackground>
          <AppShell initialUnreadCount={appData.unreadCount}>{children}</AppShell>
        </AppBackground>
      </Providers>
    </NextIntlClientProvider>
  );
}

// Layout for every authenticated/app route. Reading cookies (inside
// getInitialAppData and next-intl's request config) opts this whole group into
// per-request rendering — which is exactly why the landing page lives OUTSIDE
// this group, so it can stay static. The layout itself is synchronous so the
// root shell can flush instantly; the auth fetch streams in via Suspense.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<AppBootSkeleton />}>
      <AppRoot>{children}</AppRoot>
    </Suspense>
  );
}
