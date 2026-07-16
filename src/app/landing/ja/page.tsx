import type { Metadata } from 'next';

import { AppBackground } from '@/components/AppBackground';
import { AppShell } from '@/components/AppShell';
import { StaticIntlProvider } from '@/components/StaticIntlProvider';
import type { Locale } from '@/i18n/config';
import { landingMessagesFor } from '@/i18n/messages';

import Providers from '../../providers';
import LandingContent from '../LandingContent';

const TITLE = 'Kannanao — AI日本語フラッシュカードスタジオ';
const DESCRIPTION =
  'AIで日本語のフラッシュカードを作成。マッチ・穴埋め・リコールの練習モード、トラベルモードのフレーズ集、リーダーボードと課題つきのグループ学習、XPと実績、10種類のテーマ、PDFの取り込み、デッキの共有と埋め込みに対応しています。';

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
      en: 'https://www.kannanao.com',
      ja: 'https://www.kannanao.com/landing/ja',
      'x-default': 'https://www.kannanao.com',
    },
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: 'https://www.kannanao.com/landing/ja',
    siteName: 'Kannanao',
    type: 'website',
    locale: 'ja_JP',
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

// The Japanese twin of /landing — the same tree, prerendered a second time with
// the locale pinned to 'ja'. Everything in ../page.tsx's comment applies here,
// most of all: nothing may read the locale cookie, or both pages stop being
// static. That is also why this is a route of its own rather than a `?lang=ja`
// or a cookie branch inside /landing — a static page can only have one output,
// so a second language needs a second URL. Which hreflang wants anyway.
//
// Until the translation pass lands, ja.json is empty and every string here
// falls back to its English copy (see messagesFor). The page is correct; the
// copy just isn't Japanese yet.
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
