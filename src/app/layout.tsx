import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import type { Metadata } from 'next';

import { SkipToContent } from '@/components/SkipToContent';
import { APP_NAME, APP_URL } from '@/lib/brand';

const TITLE = `${APP_NAME} — Japanese Practice for Educators & Learners`;
const DESCRIPTION =
  'Tangodachi is a Japanese practice app for educators and learners. Educators build decks with AI in minutes, assign them with deadlines, and track each learner’s progress; learners study with daily review, spaced repetition, practice games, and graded quizzes — so what they learn actually sticks.';

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  alternates: {
    canonical: '/',
    languages: {
      en: APP_URL,
      // The Japanese landing is its own URL: `/` is language-picked per visitor
      // by the middleware, which is exactly what hreflang must not point at.
      // x-default stays on the root — it is where an unmatched visitor should
      // land, and the pick sends them somewhere sensible from there.
      ja: `${APP_URL}/landing/ja`,
      'x-default': APP_URL,
    },
  },
  keywords: [
    'Japanese practice for students',
    'Japanese teacher tools',
    'AI Japanese flashcard generator',
    'spaced repetition Japanese',
    'supplemental Japanese material',
    'Japanese vocabulary practice',
    'assign Japanese homework',
    'JLPT N5 practice',
    'kanji and hiragana practice',
    'Japanese flashcards',
    'learn Japanese',
  ],
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: APP_URL,
    siteName: APP_NAME,
    type: 'website',
    locale: 'en_US',
    images: [
      {
        url: `${APP_URL}/og-image.png`,
        width: 1200,
        height: 630,
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: [`${APP_URL}/og-image.png`],
  },
};

// The root layout is a pure, data-free shell so routes that never read cookies
// (the marketing landing page) can be statically prerendered and served from
// the CDN. Everything auth-dependent lives in the (app) route group's layout,
// which is what opts those routes into per-request rendering.
export default function RootLayout({ children }: { children: React.ReactNode }) {
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
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/icon-16.png" />
        {/* PWA manifest */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#EC4899" />
        {/* iOS home screen */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content={APP_NAME} />
        {/*
          Touch icons are full-bleed opaque squares with NO baked-in rounding —
          iOS masks them with its own squircle. A pre-rounded source would show a
          pale halo outside the system mask. See scripts/build-icons.py.
        */}
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-180.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/icons/icon-167.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152.png" />
        <link rel="apple-touch-icon" href="/icons/icon-180.png" />
      </head>
      <body>
        <SkipToContent />
        <AppRouterCacheProvider>{children}</AppRouterCacheProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
