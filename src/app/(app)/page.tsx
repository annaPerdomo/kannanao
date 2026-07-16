import { getLocale } from 'next-intl/server';

import LandingPage from '@/app/landing/LandingContent';
import { resolveLocale } from '@/i18n/config';
import { getHomeData } from '@/lib/serverData';

import HomeWrapper from './_components/HomeWrapper';

// Server Component. Auth + global data are seeded in the (app) layout. Here we
// kick off the home dashboard fetch but deliberately DON'T await it — the
// pending promise is handed to the client and unwrapped inside a <Suspense>
// boundary. That lets the app shell (nav + dashboard skeleton) stream to the
// browser immediately, with the dashboard filling in the moment its
// (pinned-only) queries resolve, instead of the whole page blocking on them.
// Signed-out visitors normally never reach this route (the middleware rewrites
// anonymous `/` traffic to the static /landing page); the LandingPage fallback
// covers the stale-cookie edge case where a request slips through without a
// live session.
export default async function Page() {
  // Kicked off before the await on purpose — see above.
  const homeDataPromise = getHomeData();
  // getLocale() reads the locale cookie, which is safe here and nowhere else in
  // this tree: the (app) layout already renders this route per request. The
  // /landing twins share LandingPage but pass a build-time constant instead,
  // because that same cookie read would cost them their static prerender.
  const locale = resolveLocale(await getLocale());
  return (
    <HomeWrapper homeDataPromise={homeDataPromise}>
      <LandingPage locale={locale} />
    </HomeWrapper>
  );
}
