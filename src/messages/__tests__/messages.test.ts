import { describe, expect, it } from 'vitest';

import en from '../en.json';
import ja from '../ja.json';

type Messages = Record<string, unknown>;

/** Flattens a message catalog to dotted key paths: `{a: {b: 'x'}}` → `['a.b']`. */
function keyPaths(messages: Messages, prefix = ''): string[] {
  return Object.entries(messages).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return value !== null && typeof value === 'object' ? keyPaths(value as Messages, path) : [path];
  });
}

describe('message catalogs', () => {
  const enPaths = keyPaths(en);
  const jaPaths = keyPaths(ja);
  const enKeys = new Set(enPaths);
  const jaKeys = new Set(jaPaths);

  it('has an English catalog to fall back to', () => {
    expect(enKeys.size).toBeGreaterThan(0);
  });

  // A ja key with no en counterpart is always a typo or a stale key — the
  // deepmerge fallback in src/i18n/messages.ts would silently ship it as-is.
  it('has no Japanese key that is missing from English', () => {
    const orphans = jaPaths.filter((path) => !enKeys.has(path));
    expect(orphans).toEqual([]);
  });

  // The inverse, enforced from the translation pass onward. Until ja.json was
  // filled in, an untranslated key was expected and fell back to English; now
  // that the catalogs are complete, a missing ja key is a gap that renders
  // English copy inside an otherwise-Japanese screen. Failing here is what
  // stops a new feature from shipping half-translated: extraction adds the key
  // to en.json, and this test insists ja.json gains it too.
  //
  // Note keyPaths() walks arrays by index, so this also pins array LENGTH
  // across locales. That is deliberate and load-bearing: messagesFor() merges
  // with `arrayMerge: (_english, translated) => translated`, so a translated
  // array replaces the English one wholesale rather than falling back
  // item-by-item. A ja array one item short would silently drop that item
  // (e.g. an FAQ entry), and only this length check catches it.
  it('has no English key that is missing from Japanese', () => {
    const untranslated = enPaths.filter((path) => !jaKeys.has(path));
    expect(untranslated).toEqual([]);
  });
});
