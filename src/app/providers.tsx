'use client';
import { AppThemeProvider } from '@/contexts/ThemeContext';
import { DeckDialogProvider } from '@/contexts/DeckDialogContext';
import { AuthProvider } from '@/contexts/AuthContext';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppThemeProvider>
        <DeckDialogProvider>
          {children}
        </DeckDialogProvider>
      </AppThemeProvider>
    </AuthProvider>
  );
}
