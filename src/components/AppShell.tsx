'use client';
import Box from '@mui/material/Box';
import { usePathname } from 'next/navigation';

import { DirectMessagesProvider } from '@/contexts/DirectMessagesContext';
import { ProgressProvider } from '@/contexts/ProgressContext';
import { XpAnimationProvider } from '@/contexts/XpAnimationContext';
import type { InitialProgress } from '@/lib/dbMappers';

import { AuthGuard } from './AuthGuard';
import { Footer } from './Footer';
import { GlobalBuddy } from './GlobalBuddy';
import { NavBar } from './NavBar';
import { BOTTOM_NAV_HEIGHT, BottomNav } from './NavBar/BottomNav';

export function AppShell({
  children,
  initialProgress,
  initialUnreadCount,
}: {
  children: React.ReactNode;
  initialProgress?: InitialProgress | null;
  initialUnreadCount?: number;
}) {
  const pathname = usePathname();
  const isEmbed = pathname?.startsWith('/embed/');
  const isFullHeight = pathname?.startsWith('/notifications');

  if (isEmbed) return <>{children}</>;

  return (
    <XpAnimationProvider>
      <ProgressProvider initialProgress={initialProgress}>
        <DirectMessagesProvider initialUnreadCount={initialUnreadCount}>
          <NavBar />
          <Box
            component="main"
            id="main-content"
            sx={{
              flex: 1,
              pb: isFullHeight
                ? 0
                : { xs: `calc(${BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom))`, sm: 0 },
              ...(isFullHeight && { overflow: 'hidden' }),
            }}
          >
            <AuthGuard>{children}</AuthGuard>
          </Box>
          {!isFullHeight && <Footer />}
          <BottomNav />
          <GlobalBuddy />
        </DirectMessagesProvider>
      </ProgressProvider>
    </XpAnimationProvider>
  );
}
