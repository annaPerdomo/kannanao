'use client';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AuthProvider } from '@/contexts/AuthContext';
import { CardBorderProvider } from '@/contexts/CardBorderContext';
import { DeckDialogProvider } from '@/contexts/DeckDialogContext';
import { ShopProvider } from '@/contexts/ShopContext';
import { AppThemeProvider } from '@/contexts/ThemeContext';
import { useStaleTabReload } from '@/hooks/useStaleTabReload';
import type { InitialAuth, InitialShop } from '@/lib/dbMappers';

export default function Providers({
  children,
  initialAuth,
  initialShop,
}: {
  children: React.ReactNode;
  initialAuth?: InitialAuth;
  initialShop?: InitialShop | null;
}) {
  useStaleTabReload();

  return (
    <AuthProvider initialAuth={initialAuth}>
      <AppThemeProvider>
        <ErrorBoundary>
          <ShopProvider initialShop={initialShop}>
            <CardBorderProvider>
              <DeckDialogProvider>{children}</DeckDialogProvider>
            </CardBorderProvider>
          </ShopProvider>
        </ErrorBoundary>
      </AppThemeProvider>
    </AuthProvider>
  );
}
