import LandingPage from '@/app/landing/page';

import HomeWrapper from './_components/HomeWrapper';

// Server Component — always renders LandingPage HTML for crawlers.
// HomeWrapper (client) swaps in the dashboard once auth resolves on the client.
export default function Page() {
  return (
    <HomeWrapper>
      <LandingPage />
    </HomeWrapper>
  );
}
