'use client';
import Box from '@mui/material/Box';
import { usePathname } from 'next/navigation';

import { BuddyFriendshipProvider } from '@/contexts/BuddyFriendshipContext';
import { BuddyReactionProvider } from '@/contexts/BuddyReactionContext';
import { DirectMessagesProvider } from '@/contexts/DirectMessagesContext';
import { ProgressProvider } from '@/contexts/ProgressContext';
import { XpAnimationProvider } from '@/contexts/XpAnimationContext';
import type { InitialProgress } from '@/lib/dbMappers';

import { AuthGuard } from './AuthGuard';
import { Footer } from './Footer';
import { GlobalBuddy } from './GlobalBuddy';
import { NavBar } from './NavBar';
import { BOTTOM_NAV_HEIGHT, BottomNav } from './NavBar/BottomNav';
import { PushAutoResubscribe } from './PushAutoResubscribe';

/**
 * Surfaces that run one exercise and size themselves to the viewport
 * (<PracticeStage>). A footer under them is the difference between the answer
 * buttons being on screen and having to scroll to reach them.
 */
const FOCUS_ROUTE = /^\/(review\/.+|deck\/[^/]+\/(study|practice))/;

export function AppShell({
  children,
  initialProgress,
  initialUnreadCount,
  showFooter = true,
}: {
  children: React.ReactNode;
  initialProgress?: InitialProgress | null;
  initialUnreadCount?: number;
  /** The landing page brings its own footer (the CTA section), so it opts out
   *  of the shared one to avoid rendering two stacked footers. */
  showFooter?: boolean;
}) {
  const pathname = usePathname();
  const isEmbed = pathname?.startsWith('/embed/');
  const isFullHeight = pathname?.startsWith('/notifications');
  // The login page is a full-bleed brand scene with its own floating language
  // toggle; app chrome would double the branding and crop the artwork.
  const isLogin = pathname === '/login';
  const isFocus = !!pathname && FOCUS_ROUTE.test(pathname);

  if (isEmbed) return <>{children}</>;

  return (
    <XpAnimationProvider>
      <ProgressProvider initialProgress={initialProgress}>
        <DirectMessagesProvider initialUnreadCount={initialUnreadCount}>
          <BuddyFriendshipProvider>
            <BuddyReactionProvider>
              {!isLogin && <NavBar />}
              <Box
                component="main"
                id="main-content"
                sx={{
                  flex: 1,
                  pb:
                    isFullHeight || isLogin
                      ? 0
                      : { xs: `calc(${BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom))`, sm: 0 },
                  ...(isFullHeight && { overflow: 'hidden' }),
                }}
              >
                <AuthGuard>{children}</AuthGuard>
              </Box>
              {!isFullHeight && !isFocus && showFooter && !isLogin && <Footer />}
              {!isLogin && <BottomNav />}
              {!isLogin && <GlobalBuddy />}
              <PushAutoResubscribe />
            </BuddyReactionProvider>
          </BuddyFriendshipProvider>
        </DirectMessagesProvider>
      </ProgressProvider>
    </XpAnimationProvider>
  );
}
