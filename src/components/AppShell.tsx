'use client';
import { usePathname } from 'next/navigation';
import Box from '@mui/material/Box';
import { NavBar } from './NavBar';
import { Footer } from './Footer';
import { AuthGuard } from './AuthGuard';
import { XpAnimationProvider } from '@/contexts/XpAnimationContext';
import { GlobalBuddy } from './GlobalBuddy';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isEmbed = pathname?.startsWith('/embed/');

  if (isEmbed) return <>{children}</>;

  return (
    <XpAnimationProvider>
      <NavBar />
      <Box sx={{ flex: 1 }}>
        <AuthGuard>{children}</AuthGuard>
      </Box>
      <Footer />
      <GlobalBuddy />
    </XpAnimationProvider>
  );
}
