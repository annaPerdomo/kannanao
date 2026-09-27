import { describe, expect, it } from 'vitest';

import { type ColorScheme, themeFonts } from '@/theme';
import { buildFontHref } from '@/theme/fontLoader';

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
  'cottagecore',
  'galaxy',
];

// Pull the family names out of a built css2 URL (e.g. "Noto+Serif+JP").
function familiesIn(href: string): string[] {
  return [...href.matchAll(/family=([^:&]+)/g)].map((m) => m[1]);
}

describe('buildFontHref', () => {
  it('builds a css2 URL with display=swap for every scheme', () => {
    for (const scheme of ALL_SCHEMES) {
      const href = buildFontHref(scheme);
      expect(href).toContain('https://fonts.googleapis.com/css2?');
      expect(href).toContain('display=swap');
    }
  });

  it('lists families in alphabetical order (css2 rejects otherwise)', () => {
    for (const scheme of ALL_SCHEMES) {
      const families = familiesIn(buildFontHref(scheme));
      const sorted = [...families].sort((a, b) => a.localeCompare(b));
      expect(families).toEqual(sorted);
    }
  });

  it('loads every family each theme names in its font stacks', () => {
    for (const scheme of ALL_SCHEMES) {
      const loaded = familiesIn(buildFontHref(scheme));
      const named = Object.values(themeFonts[scheme])
        .map((stack) => stack.match(/"([^"]+)"/)?.[1])
        .filter((name): name is string => Boolean(name))
        .map((name) => name.replace(/ /g, '+'));
      for (const name of named) expect(loaded, `${scheme}: ${name}`).toContain(name);
    }
  });

  it('loads only the active theme’s fonts, not every theme’s', () => {
    const families = familiesIn(buildFontHref('sakura'));
    expect(families).toHaveLength(5);
    expect(families).toContain('Noto+Serif+JP');
    expect(families).toContain('Figtree');
    // Matcha-only fonts must not leak into other themes.
    expect(families).not.toContain('Zen+Maru+Gothic');
    expect(families).not.toContain('Shippori+Mincho');
  });

  it('includes the Matcha-exclusive fonts only for matcha', () => {
    const matcha = familiesIn(buildFontHref('matcha'));
    expect(matcha).toContain('Zen+Maru+Gothic');
    expect(matcha).toContain('Shippori+Mincho');
  });

  it('deduplicates families used in multiple slots (matcha primary+jp)', () => {
    const families = familiesIn(buildFontHref('matcha'));
    const unique = new Set(families);
    expect(families.length).toBe(unique.size);
  });
});
