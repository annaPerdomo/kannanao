import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { parseSticker, STICKERS, stickerSrc, stickerToken } from '@/lib/stickers';
import en from '@/messages/en.json';

describe('stickers', () => {
  it('has a unique id for every sticker', () => {
    const ids = STICKERS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('ships the artwork every sticker points at', () => {
    for (const sticker of STICKERS) {
      const file = join(process.cwd(), 'public', stickerSrc(sticker.id));
      expect(existsSync(file), `missing asset for ${sticker.id}`).toBe(true);
    }
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
      for (const sticker of STICKERS) {
        expect(parseSticker(stickerToken(sticker.id))?.id).toBe(sticker.id);
      }
    });
  });
});
