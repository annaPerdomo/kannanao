'use client';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AuthProvider } from '@/contexts/AuthContext';
import { CardBorderProvider } from '@/contexts/CardBorderContext';
import { DeckDialogProvider } from '@/contexts/DeckDialogContext';
import { AppThemeProvider } from '@/contexts/ThemeContext';
import { useStaleTabReload } from '@/hooks/useStaleTabReload';

export default function Providers({ children }: { children: React.ReactNode }) {
  useStaleTabReload();

  return (
    <AuthProvider>
      <AppThemeProvider>
        <ErrorBoundary>
          <CardBorderProvider>
            <DeckDialogProvider>{children}</DeckDialogProvider>
          </CardBorderProvider>
        </ErrorBoundary>
      </AppThemeProvider>
    </AuthProvider>
  );
}
