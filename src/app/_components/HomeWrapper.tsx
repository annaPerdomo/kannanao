'use client';

import { useAuth } from '@/contexts/AuthContext';
import Home from '@/pages/Home';

// Renders the dashboard when the user is authenticated, otherwise renders the
// landing page (passed as children so it is always server-rendered for SEO).
// `session` is seeded from the server, so for signed-in users this renders the
// dashboard in the initial HTML rather than after a client auth round-trip.
export default function HomeWrapper({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  if (session) return <Home />;
  return <>{children}</>;
}
