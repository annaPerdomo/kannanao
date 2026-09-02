import type { MatchPair } from '@/components/MatchPairs';
import { confusablesFor, getKanaEntry, isContextualKana } from '@/lib/kanaCurriculum';
import { hiraganaToKatakana, katakanaToHiragana } from '@/lib/reviewGames';

export interface ScriptMatchPair extends MatchPair {
  hiragana: string;
  katakana: string;
}

export const SCRIPT_MATCH_ROUND = 6;

/** Under four pairs the board is solvable by elimination, so the stage sits out. */
export const SCRIPT_MATCH_MIN_PAIRS = 4;

function buildPair(hiragana: string): ScriptMatchPair | null {
  const katakana = hiraganaToKatakana(hiragana);
  if (!getKanaEntry(hiragana) || !getKanaEntry(katakana)) return null;
  // っ/ッ and ー have no sound of their own, and ー has no hiragana at all.
  if (isContextualKana(hiragana)) return null;
  // No read-aloud button on either tile: both sides are the same sound, so
  // playing one would hand the learner the match.
  return { key: hiragana, left: hiragana, right: katakana, hiragana, katakana };
}

/**
 * Every pick pulls in one look-alike where the chart has one: シ next to ツ is
 * the skill being drilled, six unrelated characters are solvable by elimination.
 */
export function scriptMatchPairs(
  chars: string[],
  limit: number = SCRIPT_MATCH_ROUND,
): ScriptMatchPair[] {
  const out: ScriptMatchPair[] = [];
  const takenKeys = new Set<string>();
  const takenRomaji = new Set<string>();

  const add = (kana: string): boolean => {
    const pair = buildPair(katakanaToHiragana(kana));
    if (!pair || takenKeys.has(pair.key)) return false;
    // ぢ/じ and づ/ず read the same — two in one round is a guess, not a match.
    const romaji = getKanaEntry(pair.key)?.romaji ?? '';
    if (romaji && takenRomaji.has(romaji)) return false;
    takenKeys.add(pair.key);
    takenRomaji.add(romaji);
    out.push(pair);
    return true;
  };

  for (const char of chars) {
    if (out.length >= limit) break;
    if (!add(char)) continue;
    const hiragana = katakanaToHiragana(char);
    for (const lookAlike of [
      ...confusablesFor(hiraganaToKatakana(hiragana)),
      ...confusablesFor(hiragana),
    ]) {
      if (out.length >= limit) break;
      if (add(lookAlike)) break;
    }
  }

  return out;
}

/**
 * None until katakana is in the queue: a learner who has never met ア has
 * nothing to map あ onto.
 */
export function sessionScriptPairs(chars: string[]): ScriptMatchPair[] {
  if (!chars.some((kana) => getKanaEntry(kana)?.track === 'katakana')) return [];
  const pairs = scriptMatchPairs(chars);
  return pairs.length >= SCRIPT_MATCH_MIN_PAIRS ? pairs : [];
}
