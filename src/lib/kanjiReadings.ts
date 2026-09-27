import { toHiragana } from './furigana';

export type KanjiReadingDict = ReadonlyMap<string, readonly string[]>;

const VOICED: Record<string, string> = {
  か: 'が',
  き: 'ぎ',
  く: 'ぐ',
  け: 'げ',
  こ: 'ご',
  さ: 'ざ',
  し: 'じ',
  す: 'ず',
  せ: 'ぜ',
  そ: 'ぞ',
  た: 'だ',
  ち: 'ぢ',
  つ: 'づ',
  て: 'で',
  と: 'ど',
  は: 'ば',
  ひ: 'び',
  ふ: 'ぶ',
  へ: 'べ',
  ほ: 'ぼ',
};
const HALF_VOICED: Record<string, string> = { は: 'ぱ', ひ: 'ぴ', ふ: 'ぷ', へ: 'ぺ', ほ: 'ぽ' };
const GEMINATING = new Set(['く', 'き', 'つ', 'ち', 'り']);
const ITERATION_MARK = '々';

// Per-kanji readings would combine into a valid split (一|ひと + 人|り), but the
// word is jukujikun — kept whole even inside a longer compound like 一人暮らし.
const JUKUJIKUN: ReadonlyMap<string, string> = new Map([
  ['一人', 'ひとり'],
  ['二人', 'ふたり'],
  ['上手', 'じょうず'],
]);

let cached: Promise<KanjiReadingDict> | null = null;

// Source: KANJIDIC2 (EDRDG, CC BY-SA 4.0), built by the local-only
// scripts/build-kanji-readings.py.
export function loadKanjiReadings(): Promise<KanjiReadingDict> {
  cached ??= import('./kanjiReadings.json')
    .catch((err) => {
      cached = null;
      throw err;
    })
    .then(
      (mod) =>
        new Map(
          Object.entries(mod.default as Record<string, string>).map(([k, v]) => [k, v.split(',')]),
        ),
    );
  return cached;
}

// Rendaku (ひと→びと, ほん→ぽん) and っ before the next kanji (がく→がっ, きり→きっ).
function surfaceForms(reading: string, first: boolean, last: boolean): string[] {
  const forms = [reading];
  if (!first) {
    const head = reading[0];
    if (VOICED[head]) forms.push(VOICED[head] + reading.slice(1));
    if (HALF_VOICED[head]) forms.push(HALF_VOICED[head] + reading.slice(1));
  }
  if (!last) {
    for (const form of [...forms]) {
      if (form.length > 1 && GEMINATING.has(form[form.length - 1]))
        forms.push(form.slice(0, -1) + 'っ');
    }
  }
  return forms;
}

function readingsAt(chars: string[], i: number, dict: KanjiReadingDict) {
  const char = chars[i] === ITERATION_MARK && i > 0 ? chars[i - 1] : chars[i];
  return dict.get(char);
}

/** Null when a character is unknown or the dictionary allows zero or several divisions. */
export function splitReading(
  kanji: string,
  reading: string,
  dict: KanjiReadingDict,
): string[] | null {
  const chars = Array.from(kanji);
  const target = toHiragana(reading);
  if (chars.length < 2 || !target) return null;

  for (const [word, wordReading] of JUKUJIKUN) {
    if (kanji.includes(word) && target.includes(wordReading)) return null;
  }

  const found = new Map<string, number[]>();
  const walk = (i: number, pos: number, cuts: number[]) => {
    if (found.size > 1) return;
    if (i === chars.length) {
      if (pos === target.length) found.set(cuts.join(','), [...cuts]);
      return;
    }
    const readings = readingsAt(chars, i, dict);
    if (!readings) return;
    const forms = new Set(
      readings.flatMap((r) => surfaceForms(r, i === 0, i === chars.length - 1)),
    );
    for (const form of forms) {
      if (target.startsWith(form, pos))
        walk(i + 1, pos + form.length, [...cuts, pos + form.length]);
    }
  };
  walk(0, 0, []);

  if (found.size !== 1) return null;
  const [cuts] = found.values();
  return cuts.map((end, i) => reading.slice(i === 0 ? 0 : cuts[i - 1], end));
}

/** Null when the kanji isn't in the dictionary or the reading is empty. */
export function isUsualReading(
  char: string,
  reading: string,
  dict: KanjiReadingDict,
): boolean | null {
  const readings = dict.get(char);
  if (!readings || !reading) return null;
  const target = toHiragana(reading);
  return readings.some((r) => surfaceForms(r, false, false).includes(target));
}
