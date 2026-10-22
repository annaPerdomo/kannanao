import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { SHOP_ITEMS } from '@/hooks/useShop';
import { BUDDY_ART } from '@/lib/buddies';
import { parseSticker, STICKER_SETS, STICKERS, stickerSrc, stickerToken } from '@/lib/stickers';
import en from '@/messages/en.json';

const ALL = STICKER_SETS.flatMap((set) => set.stickers);

describe('stickers', () => {
  it('has a unique id for every sticker across all sets', () => {
    const ids = ALL.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('ships the artwork every sticker points at', () => {
    for (const sticker of ALL) {
      const file = join(process.cwd(), 'public', stickerSrc(sticker.id));
      expect(existsSync(file), `missing asset for ${sticker.id}`).toBe(true);
    }
  });

  it('counts every sliced file in a buddy set, so none go unpickable', () => {
    for (const set of STICKER_SETS.slice(1)) {
      const dir = BUDDY_ART[set.buddyKey].id;
      const files = readdirSync(join(process.cwd(), 'public', 'stickers', dir)).filter((f) =>
        f.endsWith('.webp'),
      );
      expect(files.length, dir).toBe(set.stickers.length);
    }
  });

  it('gives every buddy a set, keyed by its art folder', () => {
    expect(STICKER_SETS.map((s) => s.buddyKey).sort()).toEqual(Object.keys(BUDDY_ART).sort());
    for (const set of STICKER_SETS.slice(1)) {
      expect(set.stickers[0].id).toBe(`${BUDDY_ART[set.buddyKey].id}-1`);
    }
  });

  it('sells every buddy that has a set, so the unlock button has a price', () => {
    for (const set of STICKER_SETS) {
      expect(
        SHOP_ITEMS.some((i) => i.key === set.buddyKey),
        set.buddyKey,
      ).toBe(true);
    }
  });

  // Tango tokens already sit in message history; renaming one orphans those.
  it('keeps the original Tango tokens and asset paths', () => {
    expect(STICKER_SETS[0].stickers).toBe(STICKERS);
    expect(parseSticker(':wave:')?.buddyKey).toBe('buddy_tango');
    expect(stickerSrc('wave')).toBe('/stickers/wave.webp');
  });

  it('has a display name for every sticker', () => {
    const names = en.Messages.stickerNames as Record<string, string>;
    for (const sticker of STICKERS) {
      expect(names[sticker.id], `missing name for ${sticker.id}`).toBeTruthy();
    }
  });

  describe('parseSticker', () => {
    it('resolves a bare token', () => {
      expect(parseSticker(':wave:')?.id).toBe('wave');
    });

    it('resolves an alias to its canonical sticker', () => {
      expect(parseSticker(':hi:')?.id).toBe('wave');
      expect(parseSticker(':ganbatte:')?.id).toBe('ganbaru');
    });

    it('resolves a numbered buddy sticker to its set folder', () => {
      const sticker = parseSticker(':fox-3:');
      expect(sticker).toMatchObject({ id: 'fox-3', buddyKey: 'buddy_fox', number: 3 });
      expect(stickerSrc('fox-3')).toBe('/stickers/fox/3.webp');
    });

    it('rejects buddy numbers outside the set', () => {
      expect(parseSticker(':fox-0:')).toBeNull();
      expect(parseSticker(':fox-99:')).toBeNull();
      expect(parseSticker(':fox-:')).toBeNull();
    });

    it('ignores surrounding whitespace and case', () => {
      expect(parseSticker('  :WAVE:\n')?.id).toBe('wave');
    });

    // The whole point of the "whole message only" rule: a sticker keyword
    // inside a sentence must never eat the sentence.
    it('does not match a token embedded in text', () => {
      expect(parseSticker('see you :wave:')).toBeNull();
      expect(parseSticker(':wave: :wave:')).toBeNull();
    });

    it('returns null for unknown keywords and non-tokens', () => {
      expect(parseSticker(':nosuchsticker:')).toBeNull();
      expect(parseSticker('wave')).toBeNull();
      expect(parseSticker('::')).toBeNull();
      expect(parseSticker('10:30:')).toBeNull();
    });

    it('returns null for empty input', () => {
      expect(parseSticker(null)).toBeNull();
      expect(parseSticker(undefined)).toBeNull();
      expect(parseSticker('')).toBeNull();
    });

    it('round-trips the token it produces', () => {
      for (const sticker of ALL) {
        expect(parseSticker(stickerToken(sticker.id))?.id).toBe(sticker.id);
      }
    });
  });
});
