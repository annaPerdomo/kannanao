'use client';

import { Suspense, use } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import type { HomeData } from '@/lib/dbMappers';
import Home from '@/pages/Home';

import HomeSkeleton from './HomeSkeleton';

// Renders the dashboard when the user is authenticated, otherwise the landing
// page (passed as children so it's always server-rendered for SEO). The home
// data arrives as a pending promise from the server component and is unwrapped
// with `use()` inside a <Suspense> boundary, so signed-in users see the shell +
// skeleton immediately and the dashboard streams in when its data resolves.
export default function HomeWrapper({
  homeDataPromise,
  children,
}: {
  homeDataPromise: Promise<HomeData>;
  children: React.ReactNode;
}) {
  const { session } = useAuth();
  if (!session) return <>{children}</>;
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <ResolvedHome homeDataPromise={homeDataPromise} />
    </Suspense>
  );
}

function ResolvedHome({ homeDataPromise }: { homeDataPromise: Promise<HomeData> }) {
  const initialData = use(homeDataPromise);
  return <Home initialData={initialData} />;
}
