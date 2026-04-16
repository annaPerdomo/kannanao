'use client';

import { useAuth } from '@/contexts/AuthContext';
import Home from '@/pages/Home';

// Renders the dashboard when the user is authenticated, otherwise renders the
// landing page (passed as children so it is always server-rendered for SEO).
export default function HomeWrapper({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  if (session) return <Home />;
  return <>{children}</>;
}
