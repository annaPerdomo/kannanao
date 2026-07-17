import { jaJP } from '@mui/material/locale';
import { act, fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';
import { type ColorScheme, createAppTheme, themeFonts } from '@/theme';

// ─── Mock AuthContext (ThemeContext depends on it) ────────────────────────────

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    colorScheme: null,
    updateColorScheme: vi.fn(),
    user: null,
    loading: false,
  }),
}));

import { AppThemeProvider, schemeInfo, useColorScheme } from '@/contexts/ThemeContext';

// ─── Test component ───────────────────────────────────────────────────────────

function SchemeDisplay() {
  const { scheme, setScheme } = useColorScheme();
  return (
    <div>
      <span data-testid="scheme">{scheme}</span>
      <button onClick={() => setScheme('murasaki')}>Switch to Murasaki</button>
      <button onClick={() => setScheme('midnight')}>Switch to Midnight</button>
    </div>
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ThemeContext / AppThemeProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should default to sakura scheme', () => {
    renderWithProviders(
      <AppThemeProvider>
        <SchemeDisplay />
      </AppThemeProvider>,
    );
    expect(screen.getByTestId('scheme').textContent).toBe('sakura');
  });

  it('should change scheme when setScheme is called', async () => {
    renderWithProviders(
      <AppThemeProvider>
        <SchemeDisplay />
      </AppThemeProvider>,
    );

    await act(async () => {
      fireEvent.click(screen.getByText('Switch to Murasaki'));
    });

    expect(screen.getByTestId('scheme').textContent).toBe('murasaki');
  });

  it('should persist scheme to localStorage', async () => {
    renderWithProviders(
      <AppThemeProvider>
        <SchemeDisplay />
      </AppThemeProvider>,
    );

    await act(async () => {
      fireEvent.click(screen.getByText('Switch to Midnight'));
    });

    expect(localStorage.getItem('kannanao-color-scheme')).toBe('midnight');
  });

  it('should hydrate from localStorage on mount', () => {
    localStorage.setItem('kannanao-color-scheme', 'forest');

    renderWithProviders(
      <AppThemeProvider>
        <SchemeDisplay />
      </AppThemeProvider>,
    );

    expect(screen.getByTestId('scheme').textContent).toBe('forest');
  });
});

describe('createAppTheme', () => {
  const ALL_SCHEMES: ColorScheme[] = [
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

  ALL_SCHEMES.forEach((scheme) => {
    it(`should produce a valid MUI theme for scheme "${scheme}"`, () => {
      const theme = createAppTheme(scheme);

      expect(theme).toBeDefined();
      expect(theme.palette.brand).toBeDefined();
      expect(theme.palette.brand[50]).toBeTruthy();
      expect(theme.palette.brand[500]).toBeTruthy();
      expect(theme.palette.accent).toBeDefined();
      expect(theme.palette.surfaces).toBeDefined();
      expect(theme.palette.surfaces.glass).toBeTruthy();
    });
  });

  // MUI's built-in component strings can't be reached by next-intl — they're
  // baked into the components, not passed as props — so the locale bundle is the
  // only way TablePagination et al. speak Japanese.
  describe('MUI locale composition', () => {
    it('composes jaJP into the theme when locale is "ja"', () => {
      const theme = createAppTheme('sakura', 'ja');

      expect(theme.components?.MuiTablePagination?.defaultProps?.labelRowsPerPage).toBe(
        jaJP.components?.MuiTablePagination?.defaultProps?.labelRowsPerPage,
      );
      expect(theme.components?.MuiAutocomplete?.defaultProps?.clearText).toBe(
        jaJP.components?.MuiAutocomplete?.defaultProps?.clearText,
      );
    });

    it('leaves MUI on its English defaults for locale "en"', () => {
      const theme = createAppTheme('sakura', 'en');
      expect(theme.components?.MuiTablePagination?.defaultProps?.labelRowsPerPage).toBeUndefined();
    });

    it('defaults to English when no locale is passed', () => {
      const theme = createAppTheme('sakura');
      expect(theme.components?.MuiTablePagination?.defaultProps?.labelRowsPerPage).toBeUndefined();
    });

    it('keeps the scheme’s own palette and component overrides through composition', () => {
      const ja = createAppTheme('murasaki', 'ja');
      const en = createAppTheme('murasaki', 'en');

      // The locale bundle merges in alongside our overrides; it must not
      // clobber them.
      expect(ja.palette.brand[500]).toBe(en.palette.brand[500]);
      expect(ja.palette.surfaces.glass).toBe(en.palette.surfaces.glass);
      expect(ja.fonts.primary).toBe(en.fonts.primary);
      expect(ja.components?.MuiButton).toBeDefined();
    });
  });

  describe('Japanese font fallbacks', () => {
    const ALL: ColorScheme[] = [
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

    it('appends a JP chain before the generic keyword on every stack', () => {
      ALL.forEach((scheme) => {
        Object.values(themeFonts[scheme]).forEach((stack) => {
          expect(stack).toMatch(/(sans-serif|serif|monospace)$/);
          // The JP families sit between the Latin face and the generic, so the
          // browser reaches them before falling back to last-resort matching.
          expect(stack).toMatch(/Hiragino/);
          const jpIndex = stack.indexOf('Hiragino');
          expect(jpIndex).toBeGreaterThan(stack.indexOf('"'));
          expect(jpIndex).toBeLessThan(stack.lastIndexOf(','));
        });
      });
    });

    it('matches serif faces to a mincho and sans faces to a gothic', () => {
      // sakura.display is "DM Serif Display", serif → mincho chain
      expect(themeFonts.sakura.display).toContain('Hiragino Mincho ProN');
      expect(themeFonts.sakura.display).not.toContain('Hiragino Sans');
      // sakura.primary is "Nunito", sans-serif → gothic chain
      expect(themeFonts.sakura.primary).toContain('Hiragino Sans');
      expect(themeFonts.sakura.primary).not.toContain('Hiragino Mincho ProN');
    });

    it('keeps the Google family first so fontLoader still finds it', () => {
      // theme/fontLoader.ts builds each scheme's Google Fonts URL from the FIRST
      // double-quoted family in each stack. If a JP fallback ever landed ahead of
      // it — or got double-quoted — the app would request a font that was never
      // on Google Fonts and drop the real one.
      expect(themeFonts.sakura.primary.match(/"([^"]+)"/)?.[1]).toBe('Nunito');
      expect(themeFonts.matcha.display.match(/"([^"]+)"/)?.[1]).toBe('Shippori Mincho');
      ALL.forEach((scheme) => {
        Object.values(themeFonts[scheme]).forEach((stack) => {
          expect(stack.match(/"/g)?.length).toBe(2);
        });
      });
    });
  });

  it('should export schemeInfo for all 10 schemes', () => {
    const ALL_SCHEMES: ColorScheme[] = [
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
    ALL_SCHEMES.forEach((scheme) => {
      expect(schemeInfo[scheme]).toBeDefined();
      expect(schemeInfo[scheme].label).toBeTruthy();
      expect(schemeInfo[scheme].emoji).toBeTruthy();
      expect(schemeInfo[scheme].preview).toBeTruthy();
    });
  });
});
