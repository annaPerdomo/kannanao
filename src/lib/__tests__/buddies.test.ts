import { describe, expect, it } from 'vitest';

import { SHOP_ITEMS } from '@/hooks/useShop';
import {
  BUDDY_ART,
  BUDDY_FACE_COUNT,
  buddyFaceSrc,
  buddyShopSrc,
  DEFAULT_BUDDY_KEY,
  randomFaceVariant,
  resolveBuddyKey,
} from '@/lib/buddies';

import en from '../../messages/en.json';
import ja from '../../messages/ja.json';

// Coming-soon teasers render emoji-only cards and can't be bought or equipped,
// so they don't need artwork or phrase sets yet.
const buddyItems = SHOP_ITEMS.filter((i) => i.category === 'study_buddy' && !i.comingSoon);

describe('resolveBuddyKey', () => {
  it('falls back to Tango when nothing is equipped', () => {
    expect(resolveBuddyKey(undefined)).toBe(DEFAULT_BUDDY_KEY);
    expect(resolveBuddyKey(null)).toBe(DEFAULT_BUDDY_KEY);
    expect(resolveBuddyKey('')).toBe(DEFAULT_BUDDY_KEY);
  });

  it('maps unknown keys to Tango', () => {
    expect(resolveBuddyKey('buddy_retired')).toBe(DEFAULT_BUDDY_KEY);
  });

  it('passes known buddy keys through, including the restored fox', () => {
    expect(resolveBuddyKey('buddy_tanuki')).toBe('buddy_tanuki');
    expect(resolveBuddyKey('buddy_fox')).toBe('buddy_fox');
  });
});

describe('asset paths', () => {
  it('builds face paths with a clamped variant', () => {
    expect(buddyFaceSrc('buddy_tango', 3)).toBe('/buddies/faces/tango-3.webp');
    expect(buddyFaceSrc('buddy_tango', 0)).toBe('/buddies/faces/tango-1.webp');
    expect(buddyFaceSrc('buddy_tango', 99)).toBe(`/buddies/faces/tango-${BUDDY_FACE_COUNT}.webp`);
  });

  it('builds shop art paths and falls back to the default buddy', () => {
    expect(buddyShopSrc('buddy_pink_cat')).toBe('/buddies/shop/calico.webp');
    expect(buddyShopSrc('nonsense')).toBe('/buddies/shop/tango.webp');
  });

  it('randomFaceVariant stays within 1..BUDDY_FACE_COUNT', () => {
    for (let i = 0; i < 50; i++) {
      const v = randomFaceVariant();
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(BUDDY_FACE_COUNT);
    }
  });
});

describe('catalog consistency', () => {
  it('registers artwork for every study buddy in the shop', () => {
    for (const item of buddyItems) {
      expect(BUDDY_ART[item.key], `missing art for ${item.key}`).toBeDefined();
    }
  });

  it('makes the default buddy a free shop item so everyone owns it', () => {
    const tango = buddyItems.find((i) => i.key === DEFAULT_BUDDY_KEY);
    expect(tango).toBeDefined();
    expect(tango?.price).toBe(0);
    expect(tango?.comingSoon).toBeUndefined();
  });

  it.each([
    ['en', en],
    ['ja', ja],
  ] as const)('has %s name, description, and phrase sets for every buddy', (_lang, messages) => {
    const items = messages.Shop.items as Record<string, { name?: string; description?: string }>;
    const phrases = messages.Shop.buddies as Record<string, Record<string, string[]>>;
    for (const item of buddyItems) {
      expect(items[item.key]?.name, `items.${item.key}.name`).toBeTruthy();
      expect(items[item.key]?.description, `items.${item.key}.description`).toBeTruthy();
      for (const set of ['correct', 'wrong', 'idle', 'homePhrases'] as const) {
        const lines = phrases[item.key]?.[set];
        expect(Array.isArray(lines) && lines.length > 0, `buddies.${item.key}.${set}`).toBe(true);
      }
    }
  });
});
