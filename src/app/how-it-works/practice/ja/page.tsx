import type { Metadata } from 'next';

import { AppBackground } from '@/components/AppBackground';
import { AppShell } from '@/components/AppShell';
import { StaticIntlProvider } from '@/components/StaticIntlProvider';
import type { Locale } from '@/i18n/config';
import { demoLabMessagesFor } from '@/i18n/messages';
import { APP_NAME, APP_URL } from '@/lib/brand';

import Providers from '../../../providers';
import { NowGate } from '../NowGate';

export const dynamic = 'force-static';

const LOCALE: Locale = 'ja';
const messages = demoLabMessagesFor(LOCALE);
const TITLE = `練習のしくみ — ${APP_NAME}`;
const DESCRIPTION =
  '学ぶ人をえらんで、ことばに○か×をつけてみよう。あしたの練習がどう変わるか、アプリと同じしくみで見てみよう。';
const PATH = '/how-it-works/practice';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: `${PATH}/ja`,
    languages: {
      en: `${APP_URL}${PATH}`,
      ja: `${APP_URL}${PATH}/ja`,
      'x-default': `${APP_URL}${PATH}`,
    },
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${APP_URL}${PATH}/ja`,
    siteName: APP_NAME,
    type: 'website',
    locale: 'ja_JP',
  },
};

export default function HowPracticeWorksJaPage() {
  return (
    <StaticIntlProvider locale={LOCALE} messages={messages}>
      <Providers initialAuth={{ session: null, profile: null }} locale={LOCALE}>
        <AppBackground lang={LOCALE}>
          <AppShell initialUnreadCount={0} showFooter={false}>
            <NowGate />
          </AppShell>
        </AppBackground>
      </Providers>
    </StaticIntlProvider>
  );
}
