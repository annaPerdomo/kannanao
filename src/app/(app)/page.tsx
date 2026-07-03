import LandingPage from '@/app/landing/LandingContent';
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
export default function Page() {
  const homeDataPromise = getHomeData();
  return (
    <HomeWrapper homeDataPromise={homeDataPromise}>
      <LandingPage />
    </HomeWrapper>
  );
}
