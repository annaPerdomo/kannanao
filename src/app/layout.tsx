import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { Analytics } from '@vercel/analytics/next';
import type { Metadata } from 'next';

import { AppBackground } from '@/components/AppBackground';
import { AppShell } from '@/components/AppShell';
import { SkipToContent } from '@/components/SkipToContent';
import { getInitialAppData } from '@/lib/serverData';

import Providers from './providers';

// All 20 Google Font families used across the 10 color themes. Browsers only
// download the font files actually rendered by the active theme, so the single
// stylesheet request is the only shared cost — and it's loaded non-blocking.
const FONTS_HREF = [
  'https://fonts.googleapis.com/css2?',
  // Sakura / Sunset / Yuki·Forest·Midnight cute
  'family=Nunito:wght@400;500;600;700;800',
  'family=DM+Serif+Display:ital@0;1',
  'family=Fredoka:wght@400;500;600;700',
  // Shared JP fonts
  'family=Noto+Serif+JP:wght@300;400;600',
  'family=Noto+Sans+JP:wght@300;400;500;700',
  // Shared mono fonts
  'family=DM+Mono:wght@400;500',
  'family=Space+Mono:wght@400;700',
  'family=JetBrains+Mono:wght@400;500;700',
  // Murasaki / Rose Gold body
  'family=Raleway:wght@400;500;600;700',
  // Murasaki / Forest display
  'family=Playfair+Display:wght@400;700',
  // Yuki / Midnight display
  'family=Space+Grotesk:wght@400;500;600;700',
  // Yuki body
  'family=Inter:wght@400;500;600;700',
  // Ocean body
  'family=Outfit:wght@400;500;600;700',
  // Ocean display / Midnight body
  'family=Sora:wght@400;500;600;700',
  // Forest body
  'family=Lora:wght@400;500;600;700',
  // Sunset display
  'family=Abril+Fatface',
  // Lavender display / Rose Gold display
  'family=Cormorant+Garamond:wght@400;600;700',
  // Lavender body / Murasaki·Matcha·Rose Gold cute
  'family=Quicksand:wght@400;500;600;700',
  // Matcha body + JP
  'family=Zen+Maru+Gothic:wght@400;500;700',
  // Matcha display
  'family=Shippori+Mincho:wght@400;600',
  'display=swap',
].join('&');

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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Resolve auth + the app-wide provider data (progress, shop, unread count) on
  // the server. Seeding these means authenticated pages render without a client
  // auth/loading round-trip, and the nav's data loads with no client requests.
  const appData = await getInitialAppData();

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/*
          Per-theme Google Fonts — 20 families covering all 10 color themes.
          Loaded asynchronously (preload + media-swap) so this third-party
          stylesheet never blocks first paint. `display=swap` (in FONTS_HREF)
          keeps text visible in a fallback font until the web fonts arrive. The
          inline script promotes the sheet to `media="all"` once it loads;
          <noscript> covers the no-JS case.
        */}
        <link rel="preload" as="style" href={FONTS_HREF} />
        <link id="gfonts" rel="stylesheet" href={FONTS_HREF} media="print" />
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){var l=document.getElementById('gfonts');if(!l)return;var go=function(){l.media='all'};if(l.sheet){go()}else{l.addEventListener('load',go)}})();",
          }}
        />
        <noscript>
          <link rel="stylesheet" href={FONTS_HREF} />
        </noscript>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
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
        <meta name="apple-mobile-web-app-title" content="語学" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-180.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/icons/icon-167.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152.png" />
      </head>
      <body>
        <SkipToContent />
        <AppRouterCacheProvider>
          <Providers initialAuth={appData.auth} initialShop={appData.shop}>
            <AppBackground>
              <AppShell initialProgress={appData.progress} initialUnreadCount={appData.unreadCount}>
                {children}
              </AppShell>
            </AppBackground>
          </Providers>
        </AppRouterCacheProvider>
        <Analytics />
      </body>
    </html>
  );
}
