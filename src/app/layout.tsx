import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import type { Metadata } from 'next';
import { Suspense } from 'react';

import { AppBackground } from '@/components/AppBackground';
import { AppShell } from '@/components/AppShell';
import { SkipToContent } from '@/components/SkipToContent';
import { getInitialAppData } from '@/lib/serverData';

import AppBootSkeleton from './_components/AppBootSkeleton';
import Providers from './providers';

const TITLE = 'Kannanao — AI Japanese Flashcard Studio';
const DESCRIPTION =
  'Create Japanese flashcards with AI, practice with Match, Fill-in-the-blank & Recall modes, explore Travel Mode phrasebooks, study in groups with leaderboards & assignments, earn XP & achievements, customize with 10 themes, import PDFs, and share or embed decks anywhere.';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.kannanao.com'),
  alternates: {
    canonical: '/',
    languages: {
      en: 'https://www.kannanao.com',
      ja: 'https://www.kannanao.com',
      'x-default': 'https://www.kannanao.com',
    },
  },
  keywords: [
    'Japanese flashcards',
    'AI flashcard generator',
    'learn Japanese',
    'Japanese study app',
    'travel Japanese',
    'JLPT study',
    'kanji flashcards',
    'hiragana practice',
    'Japanese phrasebook',
    'group study Japanese',
  ],
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: 'https://www.kannanao.com',
    siteName: 'Kannanao',
    type: 'website',
    locale: 'en_US',
    images: [
      {
        url: 'https://www.kannanao.com/og-image.jpg',
        width: 1200,
        height: 630,
        type: 'image/jpeg',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['https://www.kannanao.com/og-image.jpg'],
  },
};

// The data-dependent provider tree. It awaits the shell-critical data (auth +
// unread badge count), but because it's rendered inside a <Suspense> boundary in
// RootLayout, that await streams instead of blocking the whole document — the
// HTML shell + boot skeleton flush immediately and this swaps in when ready.
async function AppRoot({ children }: { children: React.ReactNode }) {
  const appData = await getInitialAppData();
  return (
    <Providers initialAuth={appData.auth}>
      <AppBackground>
        <AppShell initialUnreadCount={appData.unreadCount}>{children}</AppShell>
      </AppBackground>
    </Providers>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // RootLayout itself is synchronous and does NOT await any data, so Next.js can
  // flush <html>/<head>/<body> + the boot skeleton to the browser instantly.
  // The auth/provider fetch happens in <AppRoot> inside the Suspense boundary
  // below, so it streams in rather than gating first paint.
  return (
    <html lang="en">
      <head>
        {/*
          Warm the Google Fonts connection up-front. The actual per-theme
          stylesheet is injected client-side by <ThemeFonts> based on the active
          color scheme, so only the ~5 families that theme uses are loaded
          (instead of all 20). preconnect keeps that post-hydration fetch fast.
        */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        {/*
          The UI is English (lang="en") but pages are full of Japanese vocabulary,
          so Chrome on Android repeatedly offers to "translate this page" — an
          annoying, persistent prompt for a bilingual study app. This opts the
          page out of automatic translation offers.
        */}
        <meta name="google" content="notranslate" />
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🌸</text></svg>"
        />
        {/* PWA manifest */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#EC4899" />
        {/* iOS home screen */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Kannanao" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-180.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/icons/icon-167.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152.png" />
      </head>
      <body>
        <SkipToContent />
        <AppRouterCacheProvider>
          <Suspense fallback={<AppBootSkeleton />}>
            <AppRoot>{children}</AppRoot>
          </Suspense>
        </AppRouterCacheProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
