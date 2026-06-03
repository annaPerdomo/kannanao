import LandingPage from '@/app/landing/page';
import { getHomeData } from '@/lib/serverData';

import HomeWrapper from './_components/HomeWrapper';

// Server Component. Auth + global data are seeded in the root layout; here we
// additionally fetch the home dashboard's decks on the server (in parallel,
// pooled, same-region) so the client makes no Supabase requests for them.
// Signed-out visitors get the server-rendered LandingPage (good for crawlers).
export default async function Page() {
  const { decks } = await getHomeData();
  return (
    <HomeWrapper initialDecks={decks}>
      <LandingPage />
    </HomeWrapper>
  );
}
