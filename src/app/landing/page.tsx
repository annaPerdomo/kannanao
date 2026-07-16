import { AppBackground } from '@/components/AppBackground';
import { AppShell } from '@/components/AppShell';
import { StaticIntlProvider } from '@/components/StaticIntlProvider';
import type { Locale } from '@/i18n/config';
import { landingMessagesFor } from '@/i18n/messages';

import Providers from '../providers';
import LandingContent from './LandingContent';

// The marketing landing page, statically prerendered at build time and served
// from the CDN — no per-request server render, no function invocation. It
// lives OUTSIDE the (app) route group on purpose: the (app) layout reads
// cookies, which would opt this page into dynamic rendering.
//
// Anonymous visitors to `/` are rewritten here by the middleware (the URL bar
// still shows `/`) unless they ask for Japanese, in which case they get
// /landing/ja — the same tree, built once per locale. The provider tree is
// seeded with a signed-out session so the static HTML is deterministic; if a
// signed-in user somehow lands here, the client-side auth listener picks up
// their session after hydration and the nav/CTAs update accordingly.
//
// LOCALE IS A BUILD-TIME CONSTANT HERE, AND MUST STAY ONE. Nothing on this page
// may read it from the cookie: <StaticIntlProvider> crosses a client boundary so
// that next-intl resolves its react-client build (see that file), and messages
// come from a static import rather than getMessages(). The moment either one
// touches a server API this page turns into a per-request render.
const LOCALE: Locale = 'en';
const messages = landingMessagesFor(LOCALE);

export default function LandingRoute() {
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
