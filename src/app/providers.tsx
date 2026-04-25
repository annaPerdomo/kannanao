'use client';
import { AppThemeProvider } from '@/contexts/ThemeContext';
import { DeckDialogProvider } from '@/contexts/DeckDialogContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { CardBorderProvider } from '@/contexts/CardBorderContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppThemeProvider>
        <ErrorBoundary>
          <CardBorderProvider>
            <DeckDialogProvider>
              {children}
            </DeckDialogProvider>
          </CardBorderProvider>
        </ErrorBoundary>
      </AppThemeProvider>
    </AuthProvider>
  );
}
