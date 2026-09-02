import { segmentReading } from '@/lib/kanaCurriculum';
import { shuffle } from '@/lib/reviewGames';

/**
 * Minimal pairs, written in kana: the spelling IS the reading TTS speaks, so
 * never route one of these through a romaji or mixed-script path.
 */
export interface WordPair {
  word: string;
  decoy: string;
  /** Characters a right answer records progress for. */
  chars: string[];
}

const SPELLINGS: [word: string, decoy: string][] = [
  ['きって', 'きて'],
  ['がっこう', 'がこう'],
  ['きっぷ', 'きぷ'],
  ['ざっし', 'ざし'],
  ['まって', 'まて'],
  ['はっぱ', 'はぱ'],
  ['しっぽ', 'しぽ'],
  ['せっけん', 'せけん'],
  ['いっしょ', 'いしょ'],
  ['ちょっと', 'ちょと'],

  ['カップ', 'カプ'],
  ['コップ', 'コプ'],
  ['ベッド', 'ベド'],
  ['ポケット', 'ポケト'],
  ['サッカー', 'サカー'],

  ['コーヒー', 'コヒー'],
  ['ケーキ', 'ケキ'],
  ['スーパー', 'スパー'],
  ['テーブル', 'テブル'],
  ['ノート', 'ノト'],
  ['チーズ', 'チズ'],

  ['しゅみ', 'しゆみ'],
  ['しゅくだい', 'しゆくだい'],
  ['びょういん', 'びよういん'],
  ['きゃく', 'きやく'],
  ['きょう', 'きよう'],
  ['りょこう', 'りよこう'],
  ['りゅう', 'りゆう'],
  ['ひゃく', 'ひやく'],
  ['じゅう', 'じゆう'],
  ['ぎゅうにゅう', 'ぎゅうにゆう'],
  ['ニュース', 'ニユース'],
];

function kanaCounts(reading: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const kana of segmentReading(reading)) counts.set(kana, (counts.get(kana) ?? 0) + 1);
  return counts;
}

// Only the characters the two spellings disagree on: サッカー/サカー says
// nothing about ー, so recording an answer for it would invent evidence.
function discriminatingChars(word: string, decoy: string): string[] {
  const inDecoy = kanaCounts(decoy);
  return [...kanaCounts(word)]
    .filter(([kana, count]) => count > (inDecoy.get(kana) ?? 0))
    .map(([kana]) => kana);
}

export const WORD_PAIRS: WordPair[] = SPELLINGS.map(([word, decoy]) => ({
  word,
  decoy,
  chars: discriminatingChars(word, decoy),
}));

export const WORD_PAIR_ROUND = 6;

export function pairsFor(chars: string[], limit: number = WORD_PAIR_ROUND): WordPair[] {
  const wanted = new Set(chars);
  const matched = WORD_PAIRS.filter((pair) => pair.chars.some((kana) => wanted.has(kana)));
  return shuffle(matched).slice(0, Math.max(0, limit));
}
