'use client';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { theme } from '@/theme';
import { DeckDialogProvider } from '@/contexts/DeckDialogContext';
import { AuthProvider } from '@/contexts/AuthContext';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <DeckDialogProvider>
          {children}
        </DeckDialogProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}