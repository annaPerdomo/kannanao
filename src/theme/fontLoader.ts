import { type ColorScheme, themeFonts } from '@/theme';

// Weights must cover every fontWeight the themed surfaces request, or the browser
// silently clamps to the heaviest one loaded.
const FONT_QUERY: Record<string, string> = {
  Nunito: 'family=Nunito:wght@400;500;600;700;800',
  'DM Serif Display': 'family=DM+Serif+Display:ital@0;1',
  Fredoka: 'family=Fredoka:wght@400;500;600;700',
  'Noto Serif JP': 'family=Noto+Serif+JP:wght@300;400;600',
  'Noto Sans JP': 'family=Noto+Sans+JP:wght@300;400;500;700',
  Figtree: 'family=Figtree:wght@400;500;600;700;800;900',
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
  const names = [cfg.primary, cfg.display, cfg.jp, cfg.label, cfg.cute]
    .map((stack) => stack.match(/"([^"]+)"/)?.[1])
    .filter((name): name is string => Boolean(name));
  return Array.from(new Set(names));
}

// Google's css2 endpoint returns 400 unless families are alphabetical.
export function buildFontHref(scheme: ColorScheme): string {
  const fragments = familiesForScheme(scheme)
    .filter((name) => FONT_QUERY[name])
    .sort((a, b) => a.localeCompare(b))
    .map((name) => FONT_QUERY[name]);
  return FONT_BASE + [...fragments, 'display=swap'].join('&');
}
