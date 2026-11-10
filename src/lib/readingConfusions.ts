import { hashSeed, seededShuffle } from './seededRandom';

export type ConfusionKind =
  | 'alternate'
  | 'sokuon'
  | 'long'
  | 'dakuten'
  | 'lookalike'
  | 'short'
  | 'small'
  | 'swap';

/** Strongest test distractors first. */
const KIND_ORDER: readonly ConfusionKind[] = [
  'alternate',
  'sokuon',
  'long',
  'dakuten',
  'lookalike',
  'short',
  'small',
  'swap',
];
const RUNNER_UP_POOL = 3;

const FIXED_SUFFIXES = ['ようび', 'がつ', 'にち'] as const;

const UNVOICED = 'かきくけこさしすせそたてとはひふへほ';
const VOICED = 'がぎぐげござじずぜぞだでどばびぶべぼ';

const LONG_O = 'おこごそぞとどのほぼぽもよろゅょ';
const LONG_U = 'うくぐすずつぬふぶぷむゆる';
const LONG_I = 'きぎしじちにひびぴみり';
const SOKUON_SOURCES = 'つちくき';
const SMALL_TO_LARGE: Record<string, string> = { ゃ: 'や', ゅ: 'ゆ', ょ: 'よ' };

const LOOKALIKES: readonly (readonly [string, string])[] = [
  ['さ', 'き'],
  ['は', 'ほ'],
  ['に', 'こ'],
  ['ま', 'も'],
  ['ぬ', 'め'],
  ['ね', 'れ'],
  ['れ', 'わ'],
  ['る', 'ろ'],
  ['あ', 'お'],
];

const NUMBER_READINGS: Record<number, readonly string[]> = {
  1: ['いち', 'いっ'],
  4: ['し', 'よん', 'よ'],
  6: ['ろく', 'ろっ', 'むい'],
  7: ['しち', 'なな', 'な'],
  8: ['はち', 'はっ'],
  9: ['く', 'きゅう'],
  10: ['じゅう', 'じっ', 'とお'],
};

const KANJI_NUMBERS = '一二三四五六七八九十';

function leadingNumber(word: string): number | null {
  const digits = /^[0-9０-９]+/.exec(word)?.[0];
  if (digits) {
    return Number(digits.replace(/[０-９]/g, (d) => String(d.charCodeAt(0) - 0xff10)));
  }
  const first = KANJI_NUMBERS.indexOf(word[0] ?? '');
  if (first === -1) return null;
  if (first === 9) {
    const ones = KANJI_NUMBERS.indexOf(word[1] ?? '');
    return ones >= 0 && ones < 9 ? 11 + ones : 10;
  }
  return first + 1;
}

export interface ReadingParts {
  stem: string;
  suffix: string;
}

export function splitReading(reading: string): ReadingParts {
  for (const suffix of FIXED_SUFFIXES) {
    if (reading.length > suffix.length && reading.endsWith(suffix)) {
      return { stem: reading.slice(0, -suffix.length), suffix };
    }
  }
  return { stem: reading, suffix: '' };
}

interface Candidate {
  text: string;
  kind: ConfusionKind;
}

const replaceAt = (text: string, i: number, to: string) =>
  text.slice(0, i) + to + text.slice(i + 1);

function positional(stem: string): Candidate[] {
  const out: Candidate[] = [];
  const chars = [...stem];
  chars.forEach((ch, i) => {
    const unvoiced = UNVOICED.indexOf(ch);
    const voiced = VOICED.indexOf(ch);
    if (unvoiced !== -1) out.push({ text: replaceAt(stem, i, VOICED[unvoiced]), kind: 'dakuten' });
    if (voiced !== -1) out.push({ text: replaceAt(stem, i, UNVOICED[voiced]), kind: 'dakuten' });

    if (ch === 'う' && i > 0 && (LONG_O + LONG_U).includes(chars[i - 1])) {
      out.push({ text: stem.slice(0, i) + stem.slice(i + 1), kind: 'long' });
    }

    const beforeSmall = 'ゃゅょ'.includes(chars[i + 1] ?? '\0');
    if (i > 0 && SOKUON_SOURCES.includes(ch) && !beforeSmall) {
      out.push({ text: replaceAt(stem, i, 'っ'), kind: 'sokuon' });
    }
    if (ch === 'っ') out.push({ text: replaceAt(stem, i, 'つ'), kind: 'sokuon' });

    if (SMALL_TO_LARGE[ch])
      out.push({ text: replaceAt(stem, i, SMALL_TO_LARGE[ch]), kind: 'small' });

    if (beforeSmall) return;
    for (const [a, b] of LOOKALIKES) {
      if (ch === a) out.push({ text: replaceAt(stem, i, b), kind: 'lookalike' });
      if (ch === b) out.push({ text: replaceAt(stem, i, a), kind: 'lookalike' });
    }
  });
  return out;
}

function wholeStem(stem: string, word: string, suffix: string): Candidate[] {
  const out: Candidate[] = [];
  const chars = [...stem];
  const last = chars[chars.length - 1];

  const number = leadingNumber(word);
  const readings = number === null ? undefined : NUMBER_READINGS[number];
  // A number on its own really is read both ways; only inside a longer word is one of them wrong.
  if (suffix && readings?.includes(stem)) {
    for (const other of readings) out.push({ text: other, kind: 'alternate' });
  }

  if (chars.length === 1) {
    out.push({ text: `${stem}っ`, kind: 'sokuon' });
    if (LONG_U.includes(stem)) out.push({ text: `${stem}う`, kind: 'long' });
    if (LONG_I.includes(stem)) out.push({ text: `${stem}い`, kind: 'long' });
  }
  if (LONG_O.includes(last)) out.push({ text: `${stem}う`, kind: 'long' });
  if (chars.length >= 2 && last === 'ん') {
    out.push({ text: `${chars.slice(0, -1).join('')}っ`, kind: 'sokuon' });
  }
  if (chars.length >= 2 && last === 'い') {
    out.push({ text: `${chars.slice(0, -1).join('')}う`, kind: 'long' });
  }
  if (chars.length >= 2 && !'ゃゅょっ'.includes(last)) {
    out.push({ text: chars.slice(0, -1).join(''), kind: 'short' });
  }
  if (chars.length === 2 && chars[0] !== chars[1] && !'ゃゅょっん'.includes(chars[1])) {
    out.push({ text: chars[1] + chars[0], kind: 'swap' });
  }
  return out;
}

const STARTS_BADLY = /^[っんゃゅょ]/;

/** Fewer than `count` come back when the reading leaves too little to change. */
export function readingDistractors(
  word: string,
  reading: string,
  seed: number,
  count = 2,
): string[] {
  const { stem, suffix } = splitReading(reading);
  if (!/^[ぁ-ゖー]+$/.test(stem)) return [];

  const byKind = new Map<ConfusionKind, string[]>();
  const seen = new Set<string>([stem]);
  for (const { text, kind } of [...wholeStem(stem, word, suffix), ...positional(stem)]) {
    if (!text || seen.has(text) || STARTS_BADLY.test(text)) continue;
    seen.add(text);
    byKind.set(kind, [...(byKind.get(kind) ?? []), text]);
  }

  const mixed = hashSeed(`${seed}:${reading}`);
  const lists = KIND_ORDER.filter((kind) => byKind.has(kind)).map((kind, i) =>
    seededShuffle(byKind.get(kind)!, mixed + i),
  );
  const ordered: string[] = [];
  for (let depth = 0; lists.some((list) => depth < list.length); depth++) {
    for (const list of lists) if (depth < list.length) ordered.push(list[depth]);
  }
  const [best, ...others] = ordered;
  const runnersUp = seededShuffle(others.slice(0, RUNNER_UP_POOL), mixed);
  return [best, ...runnersUp, ...others.slice(RUNNER_UP_POOL)]
    .filter(Boolean)
    .slice(0, count)
    .map((text) => text + suffix);
}

export interface ReadingChoices {
  options: string[];
  answer: string;
  suffix: string;
}

export const READING_CHOICE_COUNT = 3;

/** Null when the reading can't yield two believable wrong answers. */
export function readingChoices(word: string, reading: string, seed: number): ReadingChoices | null {
  const { stem, suffix } = splitReading(reading);
  const wrong = readingDistractors(word, reading, seed, READING_CHOICE_COUNT - 1);
  if (wrong.length < READING_CHOICE_COUNT - 1) return null;
  const stems = wrong.map((full) => (suffix ? full.slice(0, -suffix.length) : full));
  const order = hashSeed(`${seed}:order:${reading}`);
  return { options: seededShuffle([stem, ...stems], order), answer: stem, suffix };
}
