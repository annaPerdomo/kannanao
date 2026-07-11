/**
 * Pure logic helpers for the review games (under /review).
 * Game vocabulary comes from the user's decks (with starter sets in
 * `src/components/Games/data.ts` as fallback); everything here is
 * side-effect-free so it can be unit tested without mocks.
 */

/** Fisher–Yates shuffle (returns a new array). */
export function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Convert hiragana to katakana. Covers the full hiragana block (ぁ–ゖ) by
 * codepoint shift; the long-vowel mark ー and any other characters pass
 * through unchanged.
 */
export function hiraganaToKatakana(text: string): string {
  let out = '';
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    out += code >= 0x3041 && code <= 0x3096 ? String.fromCodePoint(code + 0x60) : ch;
  }
  return out;
}

/** True when the text is entirely kana (hiragana or katakana, incl. ー). */
export function isPureKana(text: string): boolean {
  return /^[ぁ-ゖァ-ヺー]+$/.test(text);
}

/** True when the text contains at least one katakana character. */
export function isKatakana(text: string): boolean {
  return /[ァ-ヺ]/.test(text);
}

/** Kana characters used as decoys in the builder game, per script. */
const KATAKANA_DECOYS =
  'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンー'.split(
    '',
  );
const HIRAGANA_DECOYS =
  'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをんー'.split(
    '',
  );

/**
 * Build the shuffled tile pool for a Kana Builder round: every character of
 * the target word (duplicates included) plus `decoyCount` random kana
 * characters — drawn from the word's own script — that do NOT appear in it.
 */
export function buildKanaTiles(kanaWord: string, decoyCount = 3): string[] {
  const wordChars = kanaWord.split('');
  const pool = isKatakana(kanaWord) ? KATAKANA_DECOYS : HIRAGANA_DECOYS;
  const candidates = shuffle(pool.filter((c) => !wordChars.includes(c)));
  return shuffle([...wordChars, ...candidates.slice(0, decoyCount)]);
}

export interface QuizOption {
  text: string;
  correct: boolean;
}

/** Shuffle a correct answer together with its distractors into quiz options. */
export function buildQuizOptions(correct: string, distractors: string[]): QuizOption[] {
  return shuffle([
    { text: correct, correct: true },
    ...distractors.map((text) => ({ text, correct: false })),
  ]);
}

/** A particle-sentence segment: plain text, or a blank accepting ≥1 particles. */
export type SentenceSegment = string | { answers: string[] };

/** Number of blanks in a particle sentence. */
export function countBlanks(segments: SentenceSegment[]): number {
  return segments.filter((s) => typeof s !== 'string').length;
}

/** Whether a particle is an accepted answer for a blank segment. */
export function isBlankAnswer(segment: SentenceSegment, particle: string): boolean {
  return typeof segment !== 'string' && segment.answers.includes(particle);
}

/** Split a list into rounds of at most `size` items (last round may be smaller). */
export function chunkRounds<T>(items: T[], size: number): T[][] {
  const rounds: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    rounds.push(items.slice(i, i + size));
  }
  return rounds;
}
