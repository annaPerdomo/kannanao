import type { Metadata } from 'next';

import { AppBackground } from '@/components/AppBackground';
import { AppShell } from '@/components/AppShell';
import { StaticIntlProvider } from '@/components/StaticIntlProvider';
import type { Locale } from '@/i18n/config';
import { demoLabMessagesFor } from '@/i18n/messages';
import { APP_NAME, APP_URL } from '@/lib/brand';

import Providers from '../../providers';
import { NowGate } from './NowGate';

// Statically prerendered like /landing — must not read cookies/headers (see
// that route's comment); ja has its own route for the same reason.
export const dynamic = 'force-static';

const LOCALE: Locale = 'en';
const messages = demoLabMessagesFor(LOCALE);
const TITLE = `How practice works — ${APP_NAME}`;
const DESCRIPTION =
  'Pick a learner, mark some words right or wrong, and watch tomorrow’s practice change — powered by the same planner the app uses every day.';
const PATH = '/how-it-works/practice';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: PATH,
    languages: {
      en: `${APP_URL}${PATH}`,
      ja: `${APP_URL}${PATH}/ja`,
      'x-default': `${APP_URL}${PATH}`,
    },
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${APP_URL}${PATH}`,
    siteName: APP_NAME,
    type: 'website',
    locale: 'en_US',
  },
};

export default function HowPracticeWorksPage() {
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
