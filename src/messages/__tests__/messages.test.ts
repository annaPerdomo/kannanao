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
  const enKeys = new Set(keyPaths(en));
  const jaKeys = keyPaths(ja);

  it('has an English catalog to fall back to', () => {
    expect(enKeys.size).toBeGreaterThan(0);
  });

  // One-directional on purpose: English is the source of truth, and extraction
  // prompts land keys in en.json long before the translation pass fills ja.json.
  // A ja key with no en counterpart is always a typo or a stale key — the
  // deepmerge fallback in src/i18n/request.ts would silently ship it as-is.
  it('has no Japanese key that is missing from English', () => {
    const orphans = jaKeys.filter((path) => !enKeys.has(path));
    expect(orphans).toEqual([]);
  });
});
