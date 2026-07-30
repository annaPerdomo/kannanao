/**
 * Reading furigana markup.
 *
 * Japanese text is stored with `{漢字|かんじ}` markup. Gemini, however, also
 * returns a per-character variant for compounds — `{無関係|む|かん|けい}`, one
 * reading per kanji — and the original single-pipe parser matched neither the
 * group nor anything inside it, so the braces and pipes rendered as literal text
 * on the card and were read aloud by the speak button. Every reader goes through
 * here so both shapes are understood in exactly one place.
 */

export type FuriganaSegment = string | { kanji: string; reading: string };

/** `{kanji|reading}` or `{kanji|reading|reading…}`. */
const GROUP_SOURCE = /\{([^|{}]+)((?:\|[^|{}]+)+)\}/;

/** A fresh matcher each call — a shared /g regex carries `lastIndex` between callers. */
export const furiganaGroupRegex = () => new RegExp(GROUP_SOURCE.source, 'g');

/**
 * One group's readings. A compound split per character (`{無関係|む|かん|けい}`)
 * becomes one pair per kanji so the ruby sits above the right character; anything
 * whose part count doesn't line up is joined back into a single reading, which
 * still renders correctly over the whole compound.
 */
function pairs(kanji: string, tail: string): { kanji: string; reading: string }[] {
  const parts = tail.slice(1).split('|');
  if (parts.length === 1) return [{ kanji, reading: parts[0] }];
  const chars = Array.from(kanji);
  if (parts.length === chars.length)
    return chars.map((ch, i) => ({ kanji: ch, reading: parts[i] }));
  return [{ kanji, reading: parts.join('') }];
}

/** Splits marked-up text into plain runs and kanji/reading pairs, in order. */
export function parseFurigana(text: string): FuriganaSegment[] {
  const segments: FuriganaSegment[] = [];
  const regex = furiganaGroupRegex();
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) segments.push(text.slice(last, match.index));
    segments.push(...pairs(match[1], match[2]));
    last = regex.lastIndex;
  }
  if (last < text.length) segments.push(text.slice(last));
  return segments;
}

/** Strips the markup, leaving the text as written — kanji included. */
export function stripFurigana(text: string): string {
  return text.replace(furiganaGroupRegex(), '$1');
}

/** Replaces each kanji run with its reading, leaving kana-only text. */
export function furiganaToKana(text: string): string {
  return parseFurigana(text)
    .map((seg) => (typeof seg === 'string' ? seg : seg.reading))
    .join('');
}

/**
 * Rewrites markup into the canonical one-reading-per-group form, so what gets
 * stored is what the rest of the app (and the furigana editor) expects:
 * `{無関係|む|かん|けい}` → `{無|む}{関|かん}{係|けい}`.
 */
export function normalizeFurigana(text: string): string {
  return parseFurigana(text)
    .map((seg) => (typeof seg === 'string' ? seg : `{${seg.kanji}|${seg.reading}}`))
    .join('');
}

/**
 * `normalizeFurigana` applied to every string in a parsed JSON value, whatever
 * its shape.
 *
 * Each route that asks Gemini for Japanese text runs its reply through this
 * before returning it, so the app only ever sees canonical markup no matter how
 * the model chose to write it that day. It walks the whole value rather than a
 * list of known field names because those lists rot: a new field carrying
 * Japanese text would silently miss out. Text without markup is returned
 * unchanged, so this is safe to run over everything.
 */
export function normalizeFuriganaDeep<T>(value: T): T {
  if (typeof value === 'string') return normalizeFurigana(value) as T;
  if (Array.isArray(value)) return value.map(normalizeFuriganaDeep) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [key, normalizeFuriganaDeep(val)]),
    ) as T;
  }
  return value;
}
