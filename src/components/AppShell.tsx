'use client';
import Box from '@mui/material/Box';
import { usePathname } from 'next/navigation';

import { XpAnimationProvider } from '@/contexts/XpAnimationContext';

import { AuthGuard } from './AuthGuard';
import { Footer } from './Footer';
import { GlobalBuddy } from './GlobalBuddy';
import { NavBar } from './NavBar';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isEmbed = pathname?.startsWith('/embed/');

  if (isEmbed) return <>{children}</>;

  return (
    <XpAnimationProvider>
      <NavBar />
      <Box component="main" id="main-content" sx={{ flex: 1 }}>
        <AuthGuard>{children}</AuthGuard>
      </Box>
      <Footer />
      <GlobalBuddy />
    </XpAnimationProvider>
  );
}
