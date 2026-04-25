import { act, fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';
import { type ColorScheme, createAppTheme } from '@/theme';

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
