'use client';

import 'react-grid-layout/css/styles.css';

import type { AppProps } from 'next/app';

import Providers from '@/app/providers';
import { StaticIntlProvider } from '@/components/StaticIntlProvider';

// These files are shared view components that the App Router pages import, but
// because `src/pages` is also the Pages Router directory, each one doubles as a
// statically prerendered shadow route (/Home, /Deck, …). Those routes render
// without the (app) group's per-request intl provider, so they need one here or
// the first component to call useTranslations fails their prerender.
//
// Hardcoded English, same as the landing page: the real, cookie-driven locale
// lives in the App Router tree that users actually navigate.
export default function App({ Component, pageProps }: AppProps) {
  return (
    <StaticIntlProvider>
      <Providers>
        <Component {...pageProps} />
      </Providers>
    </StaticIntlProvider>
  );
}
