'use client';
import CssBaseline from '@mui/material/CssBaseline';
import GlobalStyles from '@mui/material/GlobalStyles';
import { ThemeProvider } from '@mui/material/styles';
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { flushSync } from 'react-dom';

import { useAuth } from '@/contexts/AuthContext';
import { DEFAULT_LOCALE, type Locale } from '@/i18n/config';
import { type ColorScheme, createAppTheme } from '@/theme';

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => unknown;
};

// View-transition reveal for theme changes: the new theme wipes in as a circle
// growing from the top-right (near the avatar/theme switcher) while the old one
// holds underneath. See `applyScheme` for the reduced-motion / unsupported-browser
// fallback to an instant swap.
const themeTransitionStyles = {
  '::view-transition-old(root)': { animation: 'none' },
  '::view-transition-new(root)': {
    animation: 'kannanao-theme-roll-in 620ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
  '@keyframes kannanao-theme-roll-in': {
    from: { clipPath: 'circle(0% at 92% 6%)' },
    to: { clipPath: 'circle(140% at 92% 6%)' },
  },
} as const;

export type { ColorScheme };

const STORAGE_KEY = 'kannanao-color-scheme';
const VALID_SCHEMES: ColorScheme[] = [
  'sakura',
  'murasaki',
  'yuki',
  'ocean',
  'forest',
  'sunset',
  'lavender',
  'midnight',
  'matcha',
  'rosegold',
];

export const schemeInfo: Record<ColorScheme, { label: string; emoji: string; preview: string }> = {
  sakura: { label: 'Sakura', emoji: '🌸', preview: '#F472B6' },
  murasaki: { label: 'Murasaki', emoji: '💜', preview: '#A78BFA' },
  yuki: { label: 'Yuki', emoji: '❄️', preview: '#38BDF8' },
  ocean: { label: 'Ocean Blue', emoji: '🌊', preview: '#60A5FA' },
  forest: { label: 'Forest Green', emoji: '���', preview: '#4ADE80' },
  sunset: { label: 'Sunset Orange', emoji: '🌅', preview: '#FB923C' },
  lavender: { label: 'Lavender', emoji: '💐', preview: '#C084FC' },
  midnight: { label: 'Midnight', emoji: '🌙', preview: '#475569' },
  matcha: { label: 'Matcha', emoji: '🍵', preview: '#84CC16' },
  rosegold: { label: 'Rose Gold', emoji: '🌹', preview: '#FB7185' },
};

interface ThemeContextValue {
  scheme: ColorScheme;
  setScheme: (s: ColorScheme) => void;
}

const ThemeCtx = createContext<ThemeContextValue>({
  scheme: 'sakura',
  setScheme: () => {},
});

export function AppThemeProvider({
  children,
  locale = DEFAULT_LOCALE,
}: {
  children: ReactNode;
  /**
   * The active UI locale, for MUI's own built-in strings (see createAppTheme).
   * A prop, not `useLocale()`: this provider also renders outside any intl
   * provider (the bare-render cases in this file's tests), where that hook
   * throws. Callers that know their locale — both landing builds and the (app)
   * layout — pass it; everything else gets English, which is what it had before.
   */
  locale?: Locale;
}) {
  const { colorScheme: savedScheme, updateColorScheme, user, loading: authLoading } = useAuth();
  // Always start from the default so first paint is instant; the user's real
  // scheme then *rolls in* with an animation once it's resolved (see below).
  const [scheme, setSchemeState] = useState<ColorScheme>('sakura');
  const rolledInRef = useRef(false);

  // Applies a scheme change, wrapped in a View Transition for the animated reveal
  // when supported and motion is allowed; otherwise swaps instantly.
  function applyScheme(next: ColorScheme) {
    const doc = typeof document !== 'undefined' ? (document as ViewTransitionDocument) : null;
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!doc?.startViewTransition || prefersReducedMotion) {
      setSchemeState(next);
      return;
    }
    doc.startViewTransition(() => flushSync(() => setSchemeState(next)));
  }

  // Resolve the user's real scheme (authoritative profile value, falling back to
  // the localStorage cache) and roll it in once auth is ready. The first time it
  // differs from the default it animates; later external changes swap instantly.
  useEffect(() => {
    if (authLoading) return;
    const stored = localStorage.getItem(STORAGE_KEY) as ColorScheme | null;
    const target =
      savedScheme && VALID_SCHEMES.includes(savedScheme)
        ? savedScheme
        : stored && VALID_SCHEMES.includes(stored)
          ? stored
          : 'sakura';
    if (savedScheme && VALID_SCHEMES.includes(savedScheme)) {
      localStorage.setItem(STORAGE_KEY, savedScheme);
    }
    if (!rolledInRef.current) {
      rolledInRef.current = true;
      if (target !== 'sakura') {
        applyScheme(target);
        return;
      }
    }
    setSchemeState(target);
  }, [authLoading, savedScheme]);

  function setScheme(s: ColorScheme) {
    localStorage.setItem(STORAGE_KEY, s);
    applyScheme(s);
    if (user) {
      void updateColorScheme(s);
    }
  }

  const muiTheme = useMemo(() => createAppTheme(scheme, locale), [scheme, locale]);

  return (
    <ThemeCtx.Provider value={{ scheme, setScheme }}>
      <ThemeProvider theme={muiTheme}>
        <CssBaseline />
        <GlobalStyles styles={themeTransitionStyles} />
        {children}
      </ThemeProvider>
    </ThemeCtx.Provider>
  );
}

export function useColorScheme() {
  return useContext(ThemeCtx);
}
