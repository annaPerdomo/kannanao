import { type ColorScheme, themeFonts } from '@/theme';

// Google Fonts `css2` query fragment for every family used across the 10 themes,
// each with the exact weights we render (kept identical to the previous combined
// stylesheet so glyph rendering is unchanged). Keyed by the family name as it
// appears inside the `themeFonts` stacks.
const FONT_QUERY: Record<string, string> = {
  Nunito: 'family=Nunito:wght@400;500;600;700;800',
  'DM Serif Display': 'family=DM+Serif+Display:ital@0;1',
  Fredoka: 'family=Fredoka:wght@400;500;600;700',
  'Noto Serif JP': 'family=Noto+Serif+JP:wght@300;400;600',
  'Noto Sans JP': 'family=Noto+Sans+JP:wght@300;400;500;700',
  'DM Mono': 'family=DM+Mono:wght@400;500',
  'Space Mono': 'family=Space+Mono:wght@400;700',
  'JetBrains Mono': 'family=JetBrains+Mono:wght@400;500;700',
  Raleway: 'family=Raleway:wght@400;500;600;700',
  'Playfair Display': 'family=Playfair+Display:wght@400;700',
  'Space Grotesk': 'family=Space+Grotesk:wght@400;500;600;700',
  Inter: 'family=Inter:wght@400;500;600;700',
  Outfit: 'family=Outfit:wght@400;500;600;700',
  Sora: 'family=Sora:wght@400;500;600;700',
  Lora: 'family=Lora:wght@400;500;600;700',
  'Abril Fatface': 'family=Abril+Fatface',
  'Cormorant Garamond': 'family=Cormorant+Garamond:wght@400;600;700',
  Quicksand: 'family=Quicksand:wght@400;500;600;700',
  'Zen Maru Gothic': 'family=Zen+Maru+Gothic:wght@400;500;700',
  'Shippori Mincho': 'family=Shippori+Mincho:wght@400;600',
};

const FONT_BASE = 'https://fonts.googleapis.com/css2?';

// Distinct family names a theme actually renders, parsed from its font stacks.
function familiesForScheme(scheme: ColorScheme): string[] {
  const cfg = themeFonts[scheme];
  const names = [cfg.primary, cfg.display, cfg.jp, cfg.mono, cfg.cute]
    .map((stack) => stack.match(/"([^"]+)"/)?.[1])
    .filter((name): name is string => Boolean(name));
  return Array.from(new Set(names));
}

// Build the Google Fonts stylesheet URL for a single theme — only the ~5 families
// that theme uses, instead of all 20. Families must be alphabetical or css2 400s.
export function buildFontHref(scheme: ColorScheme): string {
  const fragments = familiesForScheme(scheme)
    .filter((name) => FONT_QUERY[name])
    .sort((a, b) => a.localeCompare(b))
    .map((name) => FONT_QUERY[name]);
  return FONT_BASE + [...fragments, 'display=swap'].join('&');
}
