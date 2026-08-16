import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { LANDING_NAMESPACES, landingMessagesFor, landingSeoFor, messagesFor } from '../messages';

// Stand in for a half-translated ja.json: one plain key, one array. The array is
// the interesting one — see the arrayMerge test below.
vi.mock('@/messages/ja.json', () => ({
  default: {
    Common: { close: '閉じる' },
    Landing: { seo: { featureList: ['翻訳済みの機能'] } },
  },
}));

describe('messagesFor', () => {
  it('serves English straight from the source of truth', () => {
    expect(messagesFor('en').Common.close).toBe('Close');
  });

  it('overlays Japanese on top of English', () => {
    expect(messagesFor('ja').Common.close).toBe('閉じる');
  });

  it('memoizes the merged catalog — the deepmerge must not run per request', () => {
    expect(messagesFor('ja')).toBe(messagesFor('ja'));
  });

  it('falls back to English for keys Japanese has not translated yet', () => {
    expect(messagesFor('ja').Common.cancel).toBe('Cancel');
    expect(messagesFor('ja').Landing.hero.signInButton).toBe('Sign in');
  });

  // deepmerge concatenates arrays by default, which would leave a translated
  // list as [...English, ...Japanese] — every item duplicated, English first.
  it('replaces translated arrays instead of concatenating them', () => {
    expect(messagesFor('ja').Landing.seo.featureList).toEqual(['翻訳済みの機能']);
  });

  it('keeps English arrays intact when Japanese omits them', () => {
    expect(messagesFor('ja').Landing.seo.faq).toEqual(messagesFor('en').Landing.seo.faq);
  });
});

describe('landingMessagesFor', () => {
  it('ships only the namespaces the landing renders', () => {
    expect(Object.keys(landingMessagesFor('en')).sort()).toEqual([...LANDING_NAMESPACES].sort());
  });

  it('leaves the JSON-LD copy out of the client payload', () => {
    expect(landingMessagesFor('en').Landing).not.toHaveProperty('seo');
    expect(landingMessagesFor('en').Landing.hero.signInButton).toBe('Sign in');
  });

  it('leaves the session-gated buddy copy out of the client payload', () => {
    const landing = landingMessagesFor('en');
    expect(landing.Home.buddy.friendship).not.toHaveProperty('greetings');
    expect(landing.Home.buddy.friendship).not.toHaveProperty('reactions');
    expect(landing.Shop.buddies.buddy_tango).not.toHaveProperty('friendship');
    expect(landing.Home.buddy.friendship.petBonus).toBe('+1 ❤️');
  });

  it('is a fraction of the full message payload', () => {
    const full = JSON.stringify(messagesFor('en')).length;
    expect(JSON.stringify(landingMessagesFor('en')).length).toBeLessThan(full * 0.6);
  });
});

describe('landingSeoFor', () => {
  it('returns the JSON-LD copy LandingContent renders', () => {
    const seo = landingSeoFor('en');
    expect(seo.faq.length).toBeGreaterThan(0);
    expect(seo.faq[0]).toHaveProperty('question');
    expect(seo.faq[0]).toHaveProperty('answer');
    expect(seo.featureList.length).toBeGreaterThan(0);
  });
});

/**
 * The guard behind LANDING_NAMESPACES.
 *
 * Subsetting messages is only safe while the list matches what the landing
 * actually renders, and a mismatch is quiet: next-intl renders the missing
 * key's path as visible text and logs, but the build still passes. So walk the
 * landing's import graph and compare — this is what catches the next person who
 * adds a useTranslations call to something the landing happens to mount.
 *
 * Import-reachable is a superset of render-reachable, so the direction of any
 * failure is safe: it can over-report, never under-report. Today the two sets
 * are identical, which is why this asserts equality rather than containment —
 * an extra namespace here means dead weight in the payload.
 */
function namespacesReachableFrom(entry: string): Set<string> {
  const seen = new Set<string>();
  const namespaces = new Set<string>();
  const src = path.join(process.cwd(), 'src');

  const resolve = (spec: string, from: string): string | null => {
    let base: string;
    if (spec.startsWith('@/')) base = path.join(src, spec.slice(2));
    else if (spec.startsWith('.')) base = path.resolve(path.dirname(from), spec);
    else return null; // a package, not our code

    const candidates = [`${base}.tsx`, `${base}.ts`, `${base}/index.tsx`, `${base}/index.ts`];
    return candidates.find(existsSync) ?? null;
  };

  const walk = (file: string) => {
    if (seen.has(file)) return;
    seen.add(file);
    const code = readFileSync(file, 'utf8');

    for (const match of code.matchAll(/useTranslations\(\s*['"]([^'"]+)['"]/g)) {
      namespaces.add(match[1].split('.')[0]);
    }
    for (const match of code.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
      const resolved = resolve(match[1], file);
      if (resolved) walk(resolved);
    }
  };

  walk(path.join(process.cwd(), entry));
  return namespaces;
}

describe('LANDING_NAMESPACES', () => {
  it('matches every namespace reachable from the landing page', () => {
    const reachable = namespacesReachableFrom('src/app/landing/page.tsx');
    expect([...reachable].sort()).toEqual([...LANDING_NAMESPACES].sort());
  });

  it('covers the Japanese landing too', () => {
    const reachable = namespacesReachableFrom('src/app/landing/ja/page.tsx');
    expect([...reachable].sort()).toEqual([...LANDING_NAMESPACES].sort());
  });
});
