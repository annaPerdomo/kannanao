import type { Metadata } from 'next';

import { AppBackground } from '@/components/AppBackground';
import { AppShell } from '@/components/AppShell';
import { StaticIntlProvider } from '@/components/StaticIntlProvider';
import type { Locale } from '@/i18n/config';
import { landingMessagesFor } from '@/i18n/messages';
import { APP_NAME, APP_URL } from '@/lib/brand';

import Providers from '../../providers';
import LandingContent from '../LandingContent';

// Kept in step with the ja.json glossary by hand, not by import: metadata is
// resolved outside the intl provider (see the comment below), so nothing here
// can read the catalog. The terms that must match the in-app copy are the
// practice-mode names (穴うめ / 当ててみよう) and ランキング — never リーダーボード.
const TITLE = `${APP_NAME} — 授業で使える日本語練習アプリ`;
const DESCRIPTION =
  'Tangodachiは、教室のための日本語練習アプリです。先生はデッキを作り、しめ切りつきで課題を出し、一人ひとりの進み具合を確認できます。生徒は授業で学んだことを、毎日の復習・練習モード・ゲーム・小テスト・AIフラッシュカードで、もっとたくさん練習できます。';

// Static and generate-free: a generateMetadata() would run per request and take
// the page's static prerender with it. The copy is written here rather than
// pulled from the messages for the same reason it is written at all — metadata
// is resolved outside the intl provider.
//
// `alternates` is repeated in full because Next replaces the root layout's
// object rather than merging into it, and hreflang has to be reciprocal: every
// page in the set points at every other one, or search engines ignore the lot.
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: '/landing/ja',
    languages: {
      en: APP_URL,
      ja: `${APP_URL}/landing/ja`,
      'x-default': APP_URL,
    },
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${APP_URL}/landing/ja`,
    siteName: APP_NAME,
    type: 'website',
    locale: 'ja_JP',
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

// The Japanese twin of /landing — the same tree, prerendered a second time with
// the locale pinned to 'ja'. Everything in ../page.tsx's comment applies here,
// most of all: nothing may read the locale cookie, or both pages stop being
// static. That is also why this is a route of its own rather than a `?lang=ja`
// or a cookie branch inside /landing — a static page can only have one output,
// so a second language needs a second URL. Which hreflang wants anyway.
const LOCALE: Locale = 'ja';
const messages = landingMessagesFor(LOCALE);

export default function LandingJaRoute() {
  return (
    <StaticIntlProvider locale={LOCALE} messages={messages}>
      <Providers initialAuth={{ session: null, profile: null }} locale={LOCALE}>
        <AppBackground lang={LOCALE}>
          <AppShell initialUnreadCount={0}>
            <LandingContent locale={LOCALE} />
          </AppShell>
        </AppBackground>
      </Providers>
    </StaticIntlProvider>
  );
}
