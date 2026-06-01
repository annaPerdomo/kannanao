import LandingPage from '@/app/landing/page';
import { getHomeDecks } from '@/lib/serverData';

import HomeWrapper from './_components/HomeWrapper';

// Server Component. For signed-out visitors it renders the LandingPage HTML
// (good for crawlers); for signed-in users it server-fetches their decks and
// hands them to the dashboard so it paints immediately without a client fetch.
export default async function Page() {
  const initialDecks = await getHomeDecks();
  return (
    <HomeWrapper initialDecks={initialDecks}>
      <LandingPage />
    </HomeWrapper>
  );
}
