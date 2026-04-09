'use client';
import {
  createContext, useContext, useMemo,
  useState, useEffect, type ReactNode,
} from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { createAppTheme, type ColorScheme } from '@/theme';
import { useAuth } from '@/contexts/AuthContext';

export type { ColorScheme };

const STORAGE_KEY = 'kannanao-color-scheme';
const VALID_SCHEMES: ColorScheme[] = ['sakura', 'murasaki', 'yuki'];

export const schemeInfo: Record<ColorScheme, { label: string; emoji: string; preview: string }> = {
  sakura:   { label: 'Sakura',   emoji: '🌸', preview: '#F472B6' },
  murasaki: { label: 'Murasaki', emoji: '💜', preview: '#A78BFA' },
  yuki:     { label: 'Yuki',     emoji: '❄️', preview: '#38BDF8' },
};

interface ThemeContextValue {
  scheme: ColorScheme;
  setScheme: (s: ColorScheme) => void;
}

const ThemeCtx = createContext<ThemeContextValue>({
  scheme: 'sakura',
  setScheme: () => {},
});

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const { colorScheme: savedScheme, updateColorScheme, user, loading: authLoading } = useAuth();
  const [scheme, setSchemeState] = useState<ColorScheme>('sakura');

  // 1. Hydrate from localStorage immediately (fastest, shown before auth completes)
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as ColorScheme | null;
    if (saved && VALID_SCHEMES.includes(saved)) setSchemeState(saved);
  }, []);

  // 2. Once auth loads, switch to the user's saved scheme (wins over localStorage)
  useEffect(() => {
    if (!authLoading && savedScheme && VALID_SCHEMES.includes(savedScheme)) {
      setSchemeState(savedScheme);
      localStorage.setItem(STORAGE_KEY, savedScheme);
    }
  }, [authLoading, savedScheme]);

  function setScheme(s: ColorScheme) {
    setSchemeState(s);
    localStorage.setItem(STORAGE_KEY, s);
    if (user) {
      void updateColorScheme(s);
    }
  }

  const muiTheme = useMemo(() => createAppTheme(scheme), [scheme]);

  return (
    <ThemeCtx.Provider value={{ scheme, setScheme }}>
      <ThemeProvider theme={muiTheme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeCtx.Provider>
  );
}

export function useColorScheme() {
  return useContext(ThemeCtx);
}
