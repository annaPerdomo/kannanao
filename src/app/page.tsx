import LandingPage from '@/app/landing/page';

import HomeWrapper from './_components/HomeWrapper';

// Server Component. Auth is resolved+seeded in the root layout, so for signed-in
// users HomeWrapper renders the dashboard shell immediately (no spinner); the
// dashboard's data loads progressively on the client so navigation stays snappy.
// Signed-out visitors get the server-rendered LandingPage (good for crawlers).
export default function Page() {
  return (
    <HomeWrapper>
      <LandingPage />
    </HomeWrapper>
  );
}
