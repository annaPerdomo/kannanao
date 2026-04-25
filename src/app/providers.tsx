'use client';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AuthProvider } from '@/contexts/AuthContext';
import { CardBorderProvider } from '@/contexts/CardBorderContext';
import { DeckDialogProvider } from '@/contexts/DeckDialogContext';
import { AppThemeProvider } from '@/contexts/ThemeContext';

export default function Providers({ children }: { children: React.ReactNode }) {
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
