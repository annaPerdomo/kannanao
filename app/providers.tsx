'use client';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { theme } from '@/theme';
import { DeckDialogProvider } from '@/contexts/DeckDialogContext';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <DeckDialogProvider>
        {children}
      </DeckDialogProvider>
    </ThemeProvider>
  );
}