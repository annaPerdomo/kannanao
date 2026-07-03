import { AppBackground } from '@/components/AppBackground';
import { AppShell } from '@/components/AppShell';

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
export default function LandingRoute() {
  return (
    <Providers initialAuth={{ session: null, profile: null }}>
      <AppBackground>
        <AppShell initialUnreadCount={0}>
          <LandingContent />
        </AppShell>
      </AppBackground>
    </Providers>
  );
}
