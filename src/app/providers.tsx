'use client';
import { AppThemeProvider } from '@/contexts/ThemeContext';
import { DeckDialogProvider } from '@/contexts/DeckDialogContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { CardBorderProvider } from '@/contexts/CardBorderContext';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppThemeProvider>
        <CardBorderProvider>
          <DeckDialogProvider>
            {children}
          </DeckDialogProvider>
        </CardBorderProvider>
      </AppThemeProvider>
    </AuthProvider>
  );
}
