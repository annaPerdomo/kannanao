import { createTheme, alpha, Theme } from '@mui/material/styles';

export type ColorScheme = 'sakura' | 'murasaki' | 'yuki';

type ColorScale = {
  50: string; 100: string; 200: string; 300: string; 400: string;
  500: string; 600: string; 700: string; 800: string; 900: string;
};

declare module '@mui/material/styles' {
  interface Palette {
    /** Primary brand color scale (50–900) — changes per scheme */
    brand: ColorScale;
    /** Secondary accent color scale (50–900) — changes per scheme */
    accent: ColorScale;
    /** Pre-computed surface tokens derived from the current scheme */
    surfaces: {
      glass:   string; // AppBar / sticky UI glass background
      overlay: string; // Dialog / menu overlay background
      input:   string; // Input field background
      chip:    string; // Chip / tag background
    };
  }
  interface PaletteOptions {
    brand?:    Partial<ColorScale>;
    accent?:   Partial<ColorScale>;
    surfaces?: Partial<{ glass: string; overlay: string; input: string; chip: string }>;
  }
}

// ─── Color scales ─────────────────────────────────────────────────────────────

const pink: ColorScale = {
  50:  '#FFF5FB',
  100: '#FDE8F3',
  200: '#FBCFE8',
  300: '#F9A8D4',
  400: '#F472B6',
  500: '#EC4899',
  600: '#DB2777',
  700: '#BE185D',
  800: '#9D174D',
  900: '#831843',
};

const purple: ColorScale = {
  50:  '#F5F3FF',
  100: '#EDE9FE',
  200: '#DDD6FE',
  300: '#C4B5FD',
  400: '#A78BFA',
  500: '#8B5CF6',
  600: '#7C3AED',
  700: '#6D28D9',
  800: '#5B21B6',
  900: '#4C1D95',
};

const sky: ColorScale = {
  50:  '#F0F9FF',
  100: '#E0F2FE',
  200: '#BAE6FD',
  300: '#7DD3FC',
  400: '#38BDF8',
  500: '#0EA5E9',
  600: '#0284C7',
  700: '#0369A1',
  800: '#075985',
  900: '#0C4A6E',
};

// ─── Scheme configurations ────────────────────────────────────────────────────

type SchemeConfig = {
  brand: ColorScale;
  accent: ColorScale;
  primaryMain: string; primaryLight: string; primaryDark: string;
  secondaryMain: string; secondaryLight: string; secondaryDark: string;
  bgDefault: string; bgPaper: string;
  textPrimary: string; textSecondary: string;
};

const schemes: Record<ColorScheme, SchemeConfig> = {
  /** 🌸 Sakura — classic kawaii pink & lavender */
  sakura: {
    brand: pink, accent: purple,
    primaryMain: pink[400], primaryLight: pink[100], primaryDark: pink[700],
    secondaryMain: purple[300], secondaryLight: purple[100], secondaryDark: purple[500],
    bgDefault: '#FFF5FB', bgPaper: '#FFFFFF',
    textPrimary: '#5E2F6C', textSecondary: '#A86C99',
  },
  /** 💜 Murasaki — dreamy violet & pink */
  murasaki: {
    brand: purple, accent: pink,
    primaryMain: purple[400], primaryLight: purple[100], primaryDark: purple[700],
    secondaryMain: pink[300], secondaryLight: pink[100], secondaryDark: pink[700],
    bgDefault: '#F5F3FF', bgPaper: '#FFFFFF',
    textPrimary: '#2E1065', textSecondary: '#7C3AED',
  },
  /** ❄️ Yuki — frosty sky blue & violet */
  yuki: {
    brand: sky, accent: purple,
    primaryMain: sky[400], primaryLight: sky[100], primaryDark: sky[700],
    secondaryMain: purple[300], secondaryLight: purple[100], secondaryDark: purple[700],
    bgDefault: '#F0F9FF', bgPaper: '#FFFFFF',
    textPrimary: '#0C4A6E', textSecondary: '#0284C7',
  },
};

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createAppTheme(scheme: ColorScheme = 'sakura'): Theme {
  const s = schemes[scheme];
  const { brand, accent } = s;

  const surfaces = {
    glass:   alpha(brand[50], 0.82),
    overlay: alpha(brand[50], 0.97),
    input:   brand[50],
    chip:    brand[100],
  };

  return createTheme({
    palette: {
      mode: 'light',
      primary:    { main: s.primaryMain,   light: s.primaryLight,   dark: s.primaryDark   },
      secondary:  { main: s.secondaryMain, light: s.secondaryLight, dark: s.secondaryDark },
      background: { default: s.bgDefault,  paper: s.bgPaper },
      text:       { primary: s.textPrimary, secondary: s.textSecondary },
      divider:    alpha(brand[300], 0.35),
      error:      { main: '#FB7185' },
      success:    { main: '#34D399' },
      info:       { main: '#60C8F5' },
      warning:    { main: '#FBBF24' },
      brand,
      accent,
      surfaces,
    },

    typography: {
      fontFamily: '"Nunito", "Noto Sans JP", sans-serif',
      h1: { fontFamily: '"Nunito", sans-serif', fontWeight: 800, letterSpacing: '-0.02em' },
      h2: { fontFamily: '"Nunito", sans-serif', fontWeight: 800, letterSpacing: '-0.015em' },
      h3: { fontFamily: '"Nunito", sans-serif', fontWeight: 700 },
      h4: { fontFamily: '"Nunito", sans-serif', fontWeight: 800, letterSpacing: '-0.02em' },
      h5: { fontFamily: '"Nunito", sans-serif', fontWeight: 700 },
      h6: { fontFamily: '"Nunito", sans-serif', fontWeight: 600 },
      body1:  { fontFamily: '"Nunito", sans-serif', fontSize: '0.95rem', fontWeight: 500 },
      body2:  { fontFamily: '"Nunito", sans-serif', fontSize: '0.85rem', fontWeight: 500 },
      button: { fontFamily: '"Nunito", sans-serif', fontWeight: 700, letterSpacing: '0.02em', textTransform: 'none', fontSize: '0.875rem' },
      caption:{ fontFamily: '"Nunito", sans-serif', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em' },
    },

    shape: { borderRadius: 12 },

    components: {
      MuiButton: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: 10,
            padding: '8px 20px',
            boxShadow: 'none',
            transition: 'all 0.18s ease',
            '&:hover': {
              transform: 'translateY(-1px)',
              boxShadow: `0 6px 16px ${alpha(theme.palette.brand[300], 0.28)}`,
            },
            '&:active':      { transform: 'translateY(0)', boxShadow: 'none' },
            '&.Mui-disabled':{ opacity: 0.45, transform: 'none', boxShadow: 'none' },
          }),
          contained: ({ theme }) => ({
            background: `linear-gradient(135deg, ${theme.palette.brand[200]} 0%, ${theme.palette.brand[400]} 100%)`,
            color: '#fff',
            boxShadow: `0 2px 8px ${alpha(theme.palette.brand[400], 0.3)}`,
            '&:hover': {
              background: `linear-gradient(135deg, ${theme.palette.brand[300]} 0%, ${theme.palette.brand[500]} 100%)`,
              boxShadow: `0 6px 18px ${alpha(theme.palette.brand[400], 0.38)}`,
            },
          }),
          outlined: ({ theme }) => ({
            borderColor: alpha(theme.palette.brand[300], 0.7),
            borderWidth: '1.5px',
            color: theme.palette.brand[700],
            '&:hover': {
              borderColor: theme.palette.brand[400],
              borderWidth: '1.5px',
              backgroundColor: alpha(theme.palette.brand[300], 0.08),
            },
          }),
          text: ({ theme }) => ({
            color: theme.palette.brand[700],
            '&:hover': { backgroundColor: alpha(theme.palette.brand[300], 0.1) },
          }),
        },
      },

      MuiCard: {
        styleOverrides: {
          root: ({ theme }) => ({
            backgroundColor: '#FFFFFF',
            border: `1.5px solid ${alpha(theme.palette.brand[300], 0.3)}`,
            borderRadius: 14,
            boxShadow: `0 2px 10px ${alpha(theme.palette.brand[300], 0.12)}`,
            backgroundImage: 'none',
            transition: 'box-shadow 0.2s ease, transform 0.2s ease',
            '&:hover': {
              boxShadow: `0 8px 24px ${alpha(theme.palette.brand[300], 0.22)}`,
              transform: 'translateY(-2px)',
            },
          }),
        },
      },

      MuiTextField: {
        styleOverrides: {
          root: ({ theme }) => ({
            '& .MuiOutlinedInput-root': {
              fontFamily: '"Nunito", sans-serif',
              fontWeight: 600,
              fontSize: '0.9rem',
              borderRadius: 10,
              backgroundColor: theme.palette.surfaces.input,
              '& fieldset': {
                borderColor: alpha(theme.palette.brand[300], 0.5),
                borderWidth: '1.5px',
              },
              '&:hover fieldset': {
                borderColor: theme.palette.brand[300],
                borderWidth: '1.5px',
              },
              '&.Mui-focused fieldset': {
                borderColor: theme.palette.brand[400],
                borderWidth: '1.5px',
              },
            },
            '& .MuiInputLabel-root': {
              fontFamily: '"Nunito", sans-serif',
              fontWeight: 700,
              fontSize: '0.85rem',
              color: alpha(theme.palette.brand[700], 0.65),
              '&.Mui-focused': { color: theme.palette.brand[500] },
            },
          }),
        },
      },

      MuiChip: {
        styleOverrides: {
          root: ({ theme }) => ({
            fontFamily: '"Nunito", sans-serif',
            fontWeight: 700,
            fontSize: '0.75rem',
            borderRadius: 8,
            backgroundColor: theme.palette.surfaces.chip,
            border: `1px solid ${alpha(theme.palette.brand[300], 0.6)}`,
            color: theme.palette.brand[700],
            height: 24,
            '&:hover': { backgroundColor: theme.palette.brand[200] },
          }),
          deleteIcon: ({ theme }) => ({
            color: theme.palette.brand[500],
            fontSize: '14px !important',
            '&:hover': { color: theme.palette.brand[700] },
          }),
        },
      },

      MuiDivider: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderColor: alpha(theme.palette.brand[300], 0.3),
            borderWidth: 1,
          }),
        },
      },

      MuiIconButton: {
        styleOverrides: {
          root: ({ theme }) => ({
            color: theme.palette.brand[500],
            borderRadius: 8,
            transition: 'all 0.18s ease',
            '&:hover': {
              color: theme.palette.brand[700],
              backgroundColor: alpha(theme.palette.brand[300], 0.14),
            },
          }),
        },
      },

      MuiPaper: {
        styleOverrides: {
          root:       { borderRadius: 14, backgroundImage: 'none' },
          elevation1: ({ theme }) => ({ boxShadow: `0 2px 10px ${alpha(theme.palette.brand[300], 0.1)}`  }),
          elevation2: ({ theme }) => ({ boxShadow: `0 4px 16px ${alpha(theme.palette.brand[300], 0.14)}` }),
          elevation3: ({ theme }) => ({ boxShadow: `0 8px 28px ${alpha(theme.palette.brand[300], 0.18)}` }),
        },
      },

      MuiTooltip: {
        styleOverrides: {
          tooltip: ({ theme }) => ({
            fontFamily: '"Nunito", sans-serif',
            fontWeight: 600,
            fontSize: '0.78rem',
            backgroundColor: theme.palette.brand[700],
            borderRadius: 8,
          }),
        },
      },

      MuiLinearProgress: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: 6,
            backgroundColor: alpha(theme.palette.brand[300], 0.25),
            height: 8,
          }),
          bar: ({ theme }) => ({
            background: `linear-gradient(90deg, ${theme.palette.brand[300]}, ${theme.palette.brand[400]})`,
            borderRadius: 6,
          }),
        },
      },

      MuiAlert: {
        styleOverrides: {
          root: ({ theme }) => ({
            fontFamily: '"Nunito", sans-serif',
            fontWeight: 600,
            borderRadius: 10,
            border: `1.5px solid ${alpha(theme.palette.brand[300], 0.4)}`,
            backgroundColor: theme.palette.surfaces.input,
          }),
        },
      },
    },
  });
}

/** Default export — sakura scheme, kept for any code that imports `theme` directly */
export const theme = createAppTheme('sakura');
