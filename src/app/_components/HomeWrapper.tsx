'use client';

import dynamic from 'next/dynamic';
import { Suspense, use } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import type { HomeData } from '@/lib/dbMappers';

import HomeSkeleton from './HomeSkeleton';

// Code-split the dashboard (pulls in react-grid-layout) into its own chunk so
// anonymous visitors — who only ever see the landing page below — never download
// it. It's only referenced inside ResolvedHome, which renders for signed-in users.
const Home = dynamic(() => import('@/pages/Home'), { loading: () => <HomeSkeleton /> });

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
