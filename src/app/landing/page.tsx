import { AppBackground } from '@/components/AppBackground';
import { AppShell } from '@/components/AppShell';
import { StaticIntlProvider } from '@/components/StaticIntlProvider';

import Providers from '../providers';
import LandingContent from './LandingContent';

// The marketing landing page, statically prerendered at build time and served
// from the CDN — no per-request server render, no function invocation. It
// lives OUTSIDE the (app) route group on purpose: the (app) layout reads
// cookies, which would opt this page into dynamic rendering.
//
// Anonymous visitors to `/` are rewritten here by the middleware (the URL bar
// still shows `/`). The provider tree is seeded with a signed-out session so
// the static HTML is deterministic; if a signed-in user somehow lands here,
// the client-side auth listener picks up their session after hydration and
// the nav/CTAs update accordingly.
//
// <StaticIntlProvider> is hardcoded English and crosses a client boundary on
// purpose — it must never read the locale cookie, which would drag this page
// into per-request rendering. The page needs *an* intl context because it
// renders AppShell (→ NavBar → EditNameDialog → StyledDialog); it just must not
// be a cookie-derived one.
export default function LandingRoute() {
  return (
    <StaticIntlProvider>
      <Providers initialAuth={{ session: null, profile: null }}>
        <AppBackground>
          <AppShell initialUnreadCount={0}>
            <LandingContent />
          </AppShell>
        </AppBackground>
      </Providers>
    </StaticIntlProvider>
  );
}
