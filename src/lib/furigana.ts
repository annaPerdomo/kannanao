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

/** Han characters plus the marks that ride inside a kanji run (々〆ヶ〇). */
const KANJI_CHARS = '㐀-鿿豈-﫿々〆〇ヶ';

const KANJI_CHAR = new RegExp(`[${KANJI_CHARS}]`);

/** Safe to share: String#match with /g ignores and resets `lastIndex`. */
const KANJI_RUN_SPLIT = new RegExp(`[${KANJI_CHARS}]+|[^${KANJI_CHARS}]+`, 'g');

const isKanjiRun = (run: string) => KANJI_CHAR.test(run[0]);

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Katakana folded to hiragana so a word's ゴム matches a reading's ごむ. */
const toHiragana = (s: string) =>
  s.replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));

/**
 * Builds `{漢字|かんじ}` markup for a word stored without any, by lining its
 * kanji runs up against the whole-word kana reading: the word's own kana act
 * as anchors and whatever reading sits between them belongs to the kanji run
 * there (`貸す` + `かす` → `{貸|か}す`).
 *
 * Returns null when there is nothing to annotate (no kanji, no reading) or
 * when the reading doesn't line up with the word's kana — callers keep their
 * existing plain-text display in that case.
 */
export function furiganaFromReading(word: string, reading: string): string | null {
  const kana = toHiragana(reading.trim());
  if (!kana || !word) return null;

  const runs = word.match(KANJI_RUN_SPLIT);
  if (!runs || !runs.some(isKanjiRun)) return null;

  // Kanji runs never touch (they'd merge), so every capture is bounded by a
  // literal kana anchor or the string edge; lazy groups + anchors backtrack to
  // the one full-string split.
  const pattern = runs
    .map((run) => (isKanjiRun(run) ? '(.+?)' : escapeRegExp(toHiragana(run))))
    .join('');
  const match = kana.match(new RegExp(`^${pattern}$`));
  if (!match) return null;

  let group = 1;
  return runs.map((run) => (isKanjiRun(run) ? `{${run}|${match[group++]}}` : run)).join('');
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
