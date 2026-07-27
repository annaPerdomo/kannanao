import { jaJP } from '@mui/material/locale';
import { alpha, createTheme, type Theme, type ThemeOptions } from '@mui/material/styles';

import type { Locale } from '@/i18n/config';

export type ColorScheme =
  | 'sakura'
  | 'murasaki'
  | 'yuki'
  | 'ocean'
  | 'forest'
  | 'sunset'
  | 'lavender'
  | 'midnight'
  | 'matcha'
  | 'rosegold';

type ColorScale = {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
};

// ─── Per-theme font stacks ───────────────────────────────────────────────────
export type FontConfig = {
  primary: string; // body / UI text
  display: string; // h1 / h2 headings
  jp: string; // Japanese text
  mono: string; // captions / code
  cute: string; // decorative / playful accents
};

// Japanese system-font fallbacks, appended to every stack below by
// withJpFallbacks(). Ordered macOS/iOS first, then Windows: Hiragino ships on
// every Mac and iPhone, Yu Gothic/Meiryo on every Windows since 8.1. No webfont
// — a CJK face is megabytes, and these are already on the device.
//
// This is NOT gated on the UI locale, deliberately. The app renders Japanese
// vocabulary on every deck, card and quiz no matter which language the chrome is
// in, so an English-locale user hits these stacks just as hard as a Japanese one.
// (Locale-conditional composition is a separate concern — see createAppTheme.)
const JP_SANS_FALLBACK = "'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Yu Gothic', 'Meiryo'";
const JP_SERIF_FALLBACK = "'Hiragino Mincho ProN', 'Yu Mincho'";

// Keyed by the generic keyword each stack already ends in, so a serif display
// face falls back to a mincho and a sans body face to a gothic — matching the
// Latin face's tone instead of flattening every JP glyph to one default.
// `monospace` takes the gothic chain: there is no JP monospace we can rely on
// being installed, and JP glyphs are full-width (so they still align).
const JP_FALLBACK_FOR_GENERIC: Record<string, string> = {
  serif: JP_SERIF_FALLBACK,
  'sans-serif': JP_SANS_FALLBACK,
  monospace: JP_SANS_FALLBACK,
};

/**
 * Splices the Japanese chain in just before a stack's trailing generic keyword.
 *
 * The ~20 Google families these stacks lead with are Latin-only — Fredoka and
 * Abril Fatface have no CJK glyphs at all. Without this the browser hits の,
 * finds nothing in Fredoka, and falls through to the generic `sans-serif`, which
 * on macOS resolves to Helvetica — also no CJK — leaving the glyph to last-resort
 * system matching. That rarely produces tofu, but it does produce a font nobody
 * chose, varying by OS and mismatched in weight against the Latin text beside it.
 * Naming the families makes the fallback deterministic and tonally matched.
 *
 * Single quotes on the JP families is load-bearing: theme/fontLoader.ts builds
 * each scheme's Google Fonts URL by parsing the FIRST double-quoted name out of
 * each stack, so single-quoted system families stay invisible to it and no
 * request is made for a font that was never on Google Fonts.
 */
export function withJpFallback(stack: string): string {
  const lastComma = stack.lastIndexOf(',');
  if (lastComma === -1) return stack;
  const generic = stack.slice(lastComma + 1).trim();
  const chain = JP_FALLBACK_FOR_GENERIC[generic];
  return chain ? `${stack.slice(0, lastComma)}, ${chain}, ${generic}` : stack;
}

function withJpFallbacks(config: FontConfig): FontConfig {
  return {
    primary: withJpFallback(config.primary),
    display: withJpFallback(config.display),
    jp: withJpFallback(config.jp),
    mono: withJpFallback(config.mono),
    cute: withJpFallback(config.cute),
  };
}

// The Latin-lead stacks, exactly as authored. Only `themeFonts` (below) is
// public — components and typography read the JP-extended form, because plenty
// of them set `fontFamily: (t) => t.fonts.display` straight from the theme
// rather than going through a typography variant.
const latinThemeFonts: Record<ColorScheme, FontConfig> = {
  sakura: {
    primary: '"Nunito", sans-serif',
    display: '"DM Serif Display", serif',
    jp: '"Noto Serif JP", serif',
    mono: '"DM Mono", monospace',
    cute: '"Fredoka", sans-serif',
  },
  murasaki: {
    primary: '"Raleway", sans-serif',
    display: '"Playfair Display", serif',
    jp: '"Noto Serif JP", serif',
    mono: '"JetBrains Mono", monospace',
    cute: '"Quicksand", sans-serif',
  },
  yuki: {
    primary: '"Inter", sans-serif',
    display: '"Space Grotesk", sans-serif',
    jp: '"Noto Sans JP", sans-serif',
    mono: '"Space Mono", monospace',
    cute: '"Nunito", sans-serif',
  },
  ocean: {
    primary: '"Outfit", sans-serif',
    display: '"Sora", sans-serif',
    jp: '"Noto Sans JP", sans-serif',
    mono: '"Space Mono", monospace',
    cute: '"Fredoka", sans-serif',
  },
  forest: {
    primary: '"Lora", serif',
    display: '"Playfair Display", serif',
    jp: '"Noto Serif JP", serif',
    mono: '"DM Mono", monospace',
    cute: '"Nunito", sans-serif',
  },
  sunset: {
    primary: '"Nunito", sans-serif',
    display: '"Abril Fatface", serif',
    jp: '"Noto Sans JP", sans-serif',
    mono: '"DM Mono", monospace',
    cute: '"Fredoka", sans-serif',
  },
  lavender: {
    primary: '"Quicksand", sans-serif',
    display: '"Cormorant Garamond", serif',
    jp: '"Noto Serif JP", serif',
    mono: '"DM Mono", monospace',
    cute: '"Fredoka", sans-serif',
  },
  midnight: {
    primary: '"Sora", sans-serif',
    display: '"Space Grotesk", sans-serif',
    jp: '"Noto Sans JP", sans-serif',
    mono: '"JetBrains Mono", monospace',
    cute: '"Nunito", sans-serif',
  },
  matcha: {
    primary: '"Zen Maru Gothic", sans-serif',
    display: '"Shippori Mincho", serif',
    jp: '"Zen Maru Gothic", sans-serif',
    mono: '"DM Mono", monospace',
    cute: '"Quicksand", sans-serif',
  },
  rosegold: {
    primary: '"Raleway", sans-serif',
    display: '"Cormorant Garamond", serif',
    jp: '"Noto Serif JP", serif',
    mono: '"DM Mono", monospace',
    cute: '"Quicksand", sans-serif',
  },
};

/** The font stacks the app renders: Latin face first, JP system fallbacks, generic. */
export const themeFonts: Record<ColorScheme, FontConfig> = Object.fromEntries(
  Object.entries(latinThemeFonts).map(([scheme, config]) => [scheme, withJpFallbacks(config)]),
) as Record<ColorScheme, FontConfig>;

export const LAYOUT = {
  contentMaxWidth: 1440,
  headerMaxWidth: 1100,
  narrowMaxWidth: 900,
  pagePx: { xs: 2, sm: 4, lg: 6 } as const,
} as const;

/**
 * Semantic corner-radius scale, in CSS px strings.
 *
 * Stored as strings on purpose: MUI multiplies *numeric* `sx` `borderRadius`
 * values by `shape.borderRadius`, so a bare number here would be silently scaled
 * (e.g. `radii.md` of 12 would render as 96px). Strings pass straight through in
 * both `sx` and `styleOverrides`. Change a value here and every element that
 * references `theme.radii.*` updates at once.
 */
export type Radii = {
  sm: string; // small controls (buttons, inputs, chips)
  md: string; // menus, popovers, cards, standard containers
  lg: string; // dialogs and large hero surfaces
  pill: string; // fully-rounded pills
  card: string; // anything shaped like one of the app's cards
};

export const radii: Radii = {
  sm: '8px',
  md: '12px',
  lg: '16px',
  pill: '9999px',
  // Not ImageCard's 14px: corner roundness reads relative to box size, and a
  // deck tile is about half a flashcard's width. Scale with DECK_TILE_WIDTH.
  card: '8px',
};

declare module '@mui/material/styles' {
  interface Theme {
    fonts: FontConfig;
    radii: Radii;
  }
  interface ThemeOptions {
    fonts?: FontConfig;
    radii?: Radii;
  }
  interface Palette {
    /** Primary brand color scale (50–900) — changes per scheme */
    brand: ColorScale;
    /** Secondary accent color scale (50–900) — changes per scheme */
    accent: ColorScale;
    /** Rainbow color scale for diverse UI elements */
    rainbow: ColorScale;
    /** Pre-computed surface tokens derived from the current scheme */
    surfaces: {
      glass: string; // AppBar / sticky UI glass background
      overlay: string; // Dialog / menu overlay background
      input: string; // Input field background
      chip: string; // Chip / tag background
    };
  }
  interface PaletteOptions {
    brand?: Partial<ColorScale>;
    accent?: Partial<ColorScale>;
    rainbow?: Partial<ColorScale>;
    surfaces?: Partial<{ glass: string; overlay: string; input: string; chip: string }>;
  }
}

// ─── Color scales ─────────────────────────────────────────────────────────────

export const pink: ColorScale = {
  50: '#FFF5FB',
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

export const purple: ColorScale = {
  50: '#F5F3FF',
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

export const sky: ColorScale = {
  50: '#F0F9FF',
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

export const emerald: ColorScale = {
  50: '#ECFDF5',
  100: '#D1FAE5',
  200: '#A7F3D0',
  300: '#6EE7B7',
  400: '#34D399',
  500: '#10B981',
  600: '#059669',
  700: '#047857',
  800: '#065F46',
  900: '#064E3B',
};

export const amber: ColorScale = {
  50: '#FFFBEB',
  100: '#FEF3C7',
  200: '#FDE68A',
  300: '#FCD34D',
  400: '#FBBF24',
  500: '#F59E0B',
  600: '#D97706',
  700: '#B45309',
  800: '#92400E',
  900: '#78350F',
};

export const neutral: ColorScale = {
  50: '#FAFAFA',
  100: '#F5F5F5',
  200: '#E5E5E5',
  300: '#D4D4D4',
  400: '#A3A3A3',
  500: '#737373',
  600: '#525252',
  700: '#404040',
  800: '#262626',
  900: '#171717',
};

// ─── Shop theme color scales ─────────────────────────────────────────────────

export const ocean: ColorScale = {
  50: '#EFF6FF',
  100: '#DBEAFE',
  200: '#BFDBFE',
  300: '#93C5FD',
  400: '#60A5FA',
  500: '#3B82F6',
  600: '#2563EB',
  700: '#1D4ED8',
  800: '#1E40AF',
  900: '#1E3A8A',
};

export const teal: ColorScale = {
  50: '#F0FDFA',
  100: '#CCFBF1',
  200: '#99F6E4',
  300: '#5EEAD4',
  400: '#2DD4BF',
  500: '#14B8A6',
  600: '#0D9488',
  700: '#0F766E',
  800: '#115E59',
  900: '#134E4A',
};

export const forest: ColorScale = {
  50: '#F0FDF4',
  100: '#DCFCE7',
  200: '#BBF7D0',
  300: '#86EFAC',
  400: '#4ADE80',
  500: '#22C55E',
  600: '#16A34A',
  700: '#15803D',
  800: '#166534',
  900: '#14532D',
};

export const sunset: ColorScale = {
  50: '#FFF7ED',
  100: '#FFEDD5',
  200: '#FED7AA',
  300: '#FDBA74',
  400: '#FB923C',
  500: '#F97316',
  600: '#EA580C',
  700: '#C2410C',
  800: '#9A3412',
  900: '#7C2D12',
};

export const lavender: ColorScale = {
  50: '#FAF5FF',
  100: '#F3E8FF',
  200: '#E9D5FF',
  300: '#D8B4FE',
  400: '#C084FC',
  500: '#A855F7',
  600: '#9333EA',
  700: '#7E22CE',
  800: '#6B21A8',
  900: '#581C87',
};

export const slate: ColorScale = {
  50: '#F8FAFC',
  100: '#F1F5F9',
  200: '#E2E8F0',
  300: '#CBD5E1',
  400: '#94A3B8',
  500: '#64748B',
  600: '#475569',
  700: '#334155',
  800: '#1E293B',
  900: '#0F172A',
};

export const matcha: ColorScale = {
  50: '#FEFCE8',
  100: '#FEF9C3',
  200: '#FEF08A',
  300: '#BEF264',
  400: '#A3E635',
  500: '#84CC16',
  600: '#65A30D',
  700: '#4D7C0F',
  800: '#3F6212',
  900: '#365314',
};

export const rose: ColorScale = {
  50: '#FFF1F2',
  100: '#FFE4E6',
  200: '#FECDD3',
  300: '#FDA4AF',
  400: '#FB7185',
  500: '#F43F5E',
  600: '#E11D48',
  700: '#BE123C',
  800: '#9F1239',
  900: '#881337',
};

/** Mac-style browser chrome colours used in the embed mockup */
export const macChrome = {
  bar: '#F5F5F7',
  border: '#E5E5EA',
  addressBg: '#FFFFFF',
  addressBorder: '#E0E0E0',
  text: '#9E9EA7',
  footerBg: '#FAFAFA',
  footerBorder: '#EFEFEF',
  red: '#FF5F57',
  yellow: '#FFBD2E',
  green: '#28C840',
};

/** Very-dark purple shades for the Murasaki hero/CTA backgrounds */
export const darkPurple = {
  base: '#1A0A3C',
  mid: '#2E1065',
  midAlt: '#200B46',
  deeper: '#1e0a4a',
  deepest: '#0f0624',
};

// Theme-specific rainbow week tab colors (Mon–Sun)
// 🌸 Sakura rainbow — warm pastel rainbow with pink harmony
const rainbowSakura: ColorScale = {
  50: '#FF4D8D', // vivid rose
  100: '#FF7733', // bright tangerine
  200: '#FFCC00', // golden yellow
  300: '#22CC77', // emerald green
  400: '#1DA1F2', // twitter blue
  500: '#9B59B6', // amethyst purple
  600: '#FF69B4', // hot pink
  700: '#FF6348', // coral red
  800: '#7C4DFF', // deep violet
  900: '#00BCD4', // teal
};

// 💜 Murasaki rainbow — jewel-toned mystical rainbow
const rainbowMurasaki: ColorScale = {
  50: '#FF1493', // deep pink
  100: '#FF6600', // vivid orange
  200: '#FFD700', // gold
  300: '#00E676', // neon green
  400: '#00B0FF', // vivid sky blue
  500: '#D500F9', // electric magenta
  600: '#651FFF', // deep indigo
  700: '#FF4081', // pink accent
  800: '#1DE9B6', // turquoise
  900: '#FFAB00', // vivid amber
};

// ❄️ Yuki rainbow — icy crystalline rainbow
const rainbowYuki: ColorScale = {
  50: '#00E5FF', // bright cyan
  100: '#2979FF', // strong blue
  200: '#76FF03', // electric lime
  300: '#FF9100', // vivid amber
  400: '#E040FB', // bright magenta
  500: '#00BCD4', // dark cyan
  600: '#FF5252', // coral red
  700: '#18FFFF', // aqua
  800: '#7C4DFF', // vibrant purple
  900: '#64FFDA', // turquoise
};

// ─── Scheme configurations ────────────────────────────────────────────────────

type SchemeConfig = {
  brand: ColorScale;
  accent: ColorScale;
  rainbow: ColorScale;
  fonts: FontConfig;
  primaryMain: string;
  primaryLight: string;
  primaryDark: string;
  secondaryMain: string;
  secondaryLight: string;
  secondaryDark: string;
  bgDefault: string;
  bgPaper: string;
  textPrimary: string;
  textSecondary: string;
};

const schemes: Record<ColorScheme, SchemeConfig> = {
  /** 🌸 Sakura — classic kawaii pink & lavender */
  sakura: {
    brand: pink,
    accent: purple,
    rainbow: rainbowSakura,
    fonts: themeFonts.sakura,
    primaryMain: pink[400],
    primaryLight: pink[100],
    primaryDark: pink[700],
    secondaryMain: purple[300],
    secondaryLight: purple[100],
    secondaryDark: purple[500],
    bgDefault: '#FFF5FB',
    bgPaper: '#FFFFFF',
    textPrimary: '#5E2F6C',
    textSecondary: '#A86C99',
  },
  /** 💜 Murasaki — dreamy violet & pink */
  murasaki: {
    brand: purple,
    accent: pink,
    rainbow: rainbowMurasaki,
    fonts: themeFonts.murasaki,
    primaryMain: purple[400],
    primaryLight: purple[100],
    primaryDark: purple[700],
    secondaryMain: pink[300],
    secondaryLight: pink[100],
    secondaryDark: pink[700],
    bgDefault: '#F5F3FF',
    bgPaper: '#FFFFFF',
    textPrimary: '#2E1065',
    textSecondary: '#7C3AED',
  },
  /** ❄️ Yuki — frosty sky blue & violet */
  yuki: {
    brand: sky,
    accent: purple,
    rainbow: rainbowYuki,
    fonts: themeFonts.yuki,
    primaryMain: sky[400],
    primaryLight: sky[100],
    primaryDark: sky[700],
    secondaryMain: purple[300],
    secondaryLight: purple[100],
    secondaryDark: purple[700],
    bgDefault: '#F0F9FF',
    bgPaper: '#FFFFFF',
    textPrimary: '#0C4A6E',
    textSecondary: '#0284C7',
  },
  /** 🌊 Ocean — deep blue & teal */
  ocean: {
    brand: ocean,
    accent: teal,
    rainbow: rainbowYuki,
    fonts: themeFonts.ocean,
    primaryMain: ocean[400],
    primaryLight: ocean[100],
    primaryDark: ocean[700],
    secondaryMain: teal[300],
    secondaryLight: teal[100],
    secondaryDark: teal[600],
    bgDefault: '#EFF6FF',
    bgPaper: '#FFFFFF',
    textPrimary: '#1E3A8A',
    textSecondary: '#2563EB',
  },
  /** 🌲 Forest — lush green & emerald */
  forest: {
    brand: forest,
    accent: emerald,
    rainbow: rainbowYuki,
    fonts: themeFonts.forest,
    primaryMain: forest[400],
    primaryLight: forest[100],
    primaryDark: forest[700],
    secondaryMain: emerald[300],
    secondaryLight: emerald[100],
    secondaryDark: emerald[600],
    bgDefault: '#F0FDF4',
    bgPaper: '#FFFFFF',
    textPrimary: '#14532D',
    textSecondary: '#16A34A',
  },
  /** 🌅 Sunset — warm orange & amber */
  sunset: {
    brand: sunset,
    accent: amber,
    rainbow: rainbowSakura,
    fonts: themeFonts.sunset,
    primaryMain: sunset[400],
    primaryLight: sunset[100],
    primaryDark: sunset[700],
    secondaryMain: amber[300],
    secondaryLight: amber[100],
    secondaryDark: amber[600],
    bgDefault: '#FFF7ED',
    bgPaper: '#FFFFFF',
    textPrimary: '#7C2D12',
    textSecondary: '#EA580C',
  },
  /** 💐 Lavender — soft purple & pink */
  lavender: {
    brand: lavender,
    accent: pink,
    rainbow: rainbowMurasaki,
    fonts: themeFonts.lavender,
    primaryMain: lavender[400],
    primaryLight: lavender[100],
    primaryDark: lavender[700],
    secondaryMain: pink[300],
    secondaryLight: pink[100],
    secondaryDark: pink[600],
    bgDefault: '#FAF5FF',
    bgPaper: '#FFFFFF',
    textPrimary: '#581C87',
    textSecondary: '#9333EA',
  },
  /** 🌙 Midnight — dark slate & sky blue */
  midnight: {
    brand: slate,
    accent: sky,
    rainbow: rainbowYuki,
    fonts: themeFonts.midnight,
    primaryMain: slate[400],
    primaryLight: slate[100],
    primaryDark: slate[700],
    secondaryMain: sky[300],
    secondaryLight: sky[100],
    secondaryDark: sky[600],
    bgDefault: '#F8FAFC',
    bgPaper: '#FFFFFF',
    textPrimary: '#0F172A',
    textSecondary: '#475569',
  },
  /** 🍵 Matcha — earthy green & lime */
  matcha: {
    brand: matcha,
    accent: emerald,
    rainbow: rainbowYuki,
    fonts: themeFonts.matcha,
    primaryMain: matcha[500],
    primaryLight: matcha[100],
    primaryDark: matcha[700],
    secondaryMain: emerald[300],
    secondaryLight: emerald[100],
    secondaryDark: emerald[600],
    bgDefault: '#FEFCE8',
    bgPaper: '#FFFFFF',
    textPrimary: '#365314',
    textSecondary: '#65A30D',
  },
  /** 🌹 Rose Gold — warm rose & amber */
  rosegold: {
    brand: rose,
    accent: amber,
    rainbow: rainbowSakura,
    fonts: themeFonts.rosegold,
    primaryMain: rose[400],
    primaryLight: rose[100],
    primaryDark: rose[700],
    secondaryMain: amber[300],
    secondaryLight: amber[100],
    secondaryDark: amber[600],
    bgDefault: '#FFF1F2',
    bgPaper: '#FFFFFF',
    textPrimary: '#881337',
    textSecondary: '#E11D48',
  },
};

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * Builds the MUI theme for a color scheme, in a given UI locale.
 *
 * `locale` only selects MUI's own built-in strings — the ones baked into the
 * components rather than passed as props, which next-intl therefore can't reach:
 * TablePagination's "1–5 of 13", the Autocomplete "No options" text, and the
 * aria-labels on the pagination arrows. Everything the app itself writes is
 * already a message key. Defaulted to 'en' so the ~40 existing callers and tests
 * keep their current behavior untouched.
 *
 * The locale must be PASSED IN, never read from the cookie here: /landing and
 * /landing/ja render this at build time with their locale pinned, and a cookie
 * read anywhere in that tree turns both of them into per-request renders.
 */
export function createAppTheme(scheme: ColorScheme = 'sakura', locale: Locale = 'en'): Theme {
  const s = schemes[scheme];
  const { brand, accent, rainbow, fonts } = s;

  const surfaces = {
    glass: alpha(brand[50], 0.82),
    overlay: alpha(brand[50], 0.97),
    input: brand[50],
    chip: brand[100],
  };

  const options: ThemeOptions = {
    fonts,
    radii,
    palette: {
      mode: 'light',
      primary: { main: s.primaryMain, light: s.primaryLight, dark: s.primaryDark },
      secondary: { main: s.secondaryMain, light: s.secondaryLight, dark: s.secondaryDark },
      background: { default: s.bgDefault, paper: s.bgPaper },
      text: { primary: s.textPrimary, secondary: s.textSecondary },
      divider: alpha(brand[300], 0.35),
      error: { main: '#E11D48' },
      success: { main: '#059669' },
      info: { main: '#0284C7' },
      warning: { main: '#B45309' },
      brand,
      accent,
      rainbow,
      surfaces,
    },

    typography: {
      fontFamily: fonts.primary,
      h1: { fontFamily: fonts.display, fontWeight: 400, letterSpacing: '-0.02em' },
      h2: { fontFamily: fonts.display, fontWeight: 400, letterSpacing: '-0.015em' },
      h3: { fontFamily: fonts.primary, fontWeight: 700 },
      h4: { fontFamily: fonts.primary, fontWeight: 700, letterSpacing: '-0.02em' },
      h5: { fontFamily: fonts.primary, fontWeight: 700 },
      h6: { fontFamily: fonts.primary, fontWeight: 600 },
      body1: { fontFamily: fonts.primary, fontSize: '0.95rem', fontWeight: 500 },
      body2: { fontFamily: fonts.primary, fontSize: '0.85rem', fontWeight: 500 },
      button: {
        fontFamily: fonts.primary,
        fontWeight: 700,
        letterSpacing: '0.02em',
        textTransform: 'none',
        fontSize: '0.875rem',
      },
      caption: {
        fontFamily: fonts.mono,
        fontSize: '0.72rem',
        fontWeight: 700,
        letterSpacing: '0.08em',
      },
    },

    // Base radius unit. MUI multiplies every numeric `sx` `borderRadius` by this,
    // so keeping it modest (8, not 12) stops the ubiquitous `borderRadius: 2/3`
    // from rendering as 24–36px pills that clip text on small surfaces. Large
    // panels still read as soft because they use larger multipliers.
    shape: { borderRadius: 8 },

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
            '&:active': { transform: 'translateY(0)', boxShadow: 'none' },
            '&.Mui-disabled': { opacity: 0.45, transform: 'none', boxShadow: 'none' },
          }),
          contained: ({ theme }) => ({
            background: `linear-gradient(135deg, ${theme.palette.brand[600]} 0%, ${theme.palette.brand[700]} 100%)`,
            color: '#fff',
            boxShadow: `0 2px 8px ${alpha(theme.palette.brand[600], 0.3)}`,
            '&:hover': {
              background: `linear-gradient(135deg, ${theme.palette.brand[700]} 0%, ${theme.palette.brand[800]} 100%)`,
              boxShadow: `0 6px 18px ${alpha(theme.palette.brand[700], 0.38)}`,
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
            borderRadius: radii.md,
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
              fontFamily: theme.typography.fontFamily,
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
              fontFamily: theme.typography.fontFamily,
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
            fontFamily: theme.typography.fontFamily,
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
          root: { borderRadius: radii.md, backgroundImage: 'none' },
          elevation1: ({ theme }) => ({
            boxShadow: `0 2px 10px ${alpha(theme.palette.brand[300], 0.1)}`,
          }),
          elevation2: ({ theme }) => ({
            boxShadow: `0 4px 16px ${alpha(theme.palette.brand[300], 0.14)}`,
          }),
          elevation3: ({ theme }) => ({
            boxShadow: `0 8px 28px ${alpha(theme.palette.brand[300], 0.18)}`,
          }),
        },
      },

      MuiTooltip: {
        styleOverrides: {
          tooltip: ({ theme }) => ({
            fontFamily: theme.typography.fontFamily,
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
            fontFamily: theme.typography.fontFamily,
            fontWeight: 600,
            borderRadius: 10,
            border: `1.5px solid ${alpha(theme.palette.brand[300], 0.4)}`,
            backgroundColor: theme.palette.surfaces.input,
          }),
        },
      },
    },
  };

  // The locale bundle goes in as a second argument rather than via a second
  // createTheme() pass over a finished theme: both are documented, but this way
  // the options are processed exactly once, so nothing that reads
  // `theme.palette.*` inside a component override is computed against a
  // half-merged theme.
  return locale === 'ja' ? createTheme(options, jaJP) : createTheme(options);
}

/** Default export — sakura scheme, kept for any code that imports `theme` directly */
export const theme = createAppTheme('sakura');
