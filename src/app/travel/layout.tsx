'use client';

import type { ReactNode } from 'react';

import { TravelDisplayProvider } from '@/contexts/TravelDisplayContext';

export default function TravelLayout({ children }: { children: ReactNode }) {
  return <TravelDisplayProvider>{children}</TravelDisplayProvider>;
}
