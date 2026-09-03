import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { SHOP_ITEMS } from '@/hooks/useShop';
import {
  avatarAccent,
  avatarBg,
  avatarSrc,
  BUDDY_ART,
  BUDDY_FACE_COUNT,
  buddyFaceSrc,
  buddyMemorySrc,
  buddyShopSrc,
  DEFAULT_BUDDY_KEY,
  makeAvatar,
  parseAvatar,
  randomFaceVariant,
  resolveBuddyKey,
} from '@/lib/buddies';

import en from '../../messages/en.json';
import ja from '../../messages/ja.json';

// Coming-soon teasers render a static art/emoji card and can't be bought or
// equipped, so they don't need face artwork or phrase sets yet.
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

  it('points memory scenes at the level file and falls back when one is missing', () => {
    expect(buddyMemorySrc('buddy_penguin', 3)).toBe('/buddies/memories/penguin-l3.webp');
    expect(buddyMemorySrc('buddy_tanuki', 2)).toBeNull();
    expect(buddyMemorySrc('buddy_tanuki', 3)).toBe('/buddies/memories/tanuki-l3.webp');
    expect(buddyMemorySrc('buddy_tango', 1)).toBeNull();
    expect(buddyMemorySrc('nonsense', 2)).toBeNull();
  });

  it('randomFaceVariant stays within 1..BUDDY_FACE_COUNT', () => {
    for (let i = 0; i < 50; i++) {
      const v = randomFaceVariant();
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(BUDDY_FACE_COUNT);
    }
  });
});

describe('avatars', () => {
  it('round-trips through makeAvatar and parseAvatar', () => {
    expect(parseAvatar(makeAvatar('buddy_fox', 3))).toEqual({ buddyKey: 'buddy_fox', variant: 3 });
  });

  it('rejects anything that does not resolve to a real face', () => {
    expect(parseAvatar(null)).toBeNull();
    expect(parseAvatar(undefined)).toBeNull();
    expect(parseAvatar('')).toBeNull();
    expect(parseAvatar('buddy_fox')).toBeNull();
    expect(parseAvatar('buddy_retired:3')).toBeNull();
    expect(parseAvatar('buddy_fox:0')).toBeNull();
    expect(parseAvatar(`buddy_fox:${BUDDY_FACE_COUNT + 1}`)).toBeNull();
    expect(parseAvatar('buddy_fox:2.5')).toBeNull();
  });

  it('resolves src, accent and bg for a valid avatar, null otherwise', () => {
    expect(avatarSrc('buddy_pink_cat:2')).toBe('/buddies/faces/calico-2.webp');
    expect(avatarAccent('buddy_pink_cat:2')).toBe(BUDDY_ART.buddy_pink_cat.accent);
    expect(avatarBg('buddy_pink_cat:2')).toBe(BUDDY_ART.buddy_pink_cat.bg);
    expect(avatarSrc('buddy_retired:2')).toBeNull();
    expect(avatarAccent(null)).toBeNull();
    expect(avatarBg('buddy_retired:2')).toBeNull();
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

  // Artwork is generated locally and easy to leave untracked. Buddies are
  // outside the service-worker precache, so a missing file 404s in production
  // with nothing else to catch it.
  describe('artwork exists on disk', () => {
    const publicPath = (src: string) => join(process.cwd(), 'public', src);

    it.each(buddyItems.map((i) => i.key))('has a shop pose and 8 faces for %s', (key) => {
      expect(existsSync(publicPath(buddyShopSrc(key))), buddyShopSrc(key)).toBe(true);
      for (let variant = 1; variant <= BUDDY_FACE_COUNT; variant++) {
        const face = buddyFaceSrc(key, variant);
        expect(existsSync(publicPath(face)), face).toBe(true);
      }
    });

    it('has the cutout art every coming-soon teaser points at', () => {
      const teasers = SHOP_ITEMS.filter((i) => i.image);
      expect(teasers.length).toBeGreaterThan(0);
      for (const item of teasers) {
        expect(existsSync(publicPath(item.image!)), item.image).toBe(true);
      }
    });
  });

  it.each([
    ['en', en],
    ['ja', ja],
  ] as const)('has %s name, description, and phrase sets for every buddy', (_lang, messages) => {
    const items = messages.Shop.items as Record<string, { name?: string; description?: string }>;
    const phrases = messages.Shop.buddies as Record<string, Record<string, unknown>>;
    for (const item of buddyItems) {
      expect(items[item.key]?.name, `items.${item.key}.name`).toBeTruthy();
      expect(items[item.key]?.description, `items.${item.key}.description`).toBeTruthy();
      for (const set of ['correct', 'wrong', 'idle', 'homePhrases'] as const) {
        const lines = phrases[item.key]?.[set];
        expect(Array.isArray(lines) && lines.length > 0, `buddies.${item.key}.${set}`).toBe(true);
      }
    }
  });

  // The other buddies ship without friendship copy on purpose (the readers
  // guard for it); a half-authored level on these five is a bug.
  const STORY_BUDDIES = [
    'buddy_tango',
    'buddy_bunny',
    'buddy_pink_cat',
    'buddy_tanuki',
    'buddy_fox',
  ];

  it.each([
    ['en', en],
    ['ja', ja],
  ] as const)(
    'has a %s story and phrase for every level the five buddies unlock',
    (_l, messages) => {
      const buddies = messages.Shop.buddies as Record<string, Record<string, unknown>>;
      for (const key of STORY_BUDDIES) {
        const friendship = buddies[key]?.friendship as Record<string, Record<string, unknown>>;
        expect(friendship, `buddies.${key}.friendship`).toBeTruthy();
        for (const level of ['l2', 'l3', 'l4', 'l5']) {
          for (const field of ['story', 'phrases']) {
            const lines = friendship?.[level]?.[field];
            expect(
              Array.isArray(lines) && lines.length > 0,
              `buddies.${key}.friendship.${level}.${field}`,
            ).toBe(true);
          }
        }
      }
    },
  );
});
