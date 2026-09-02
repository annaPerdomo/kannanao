import type { MatchPair } from '@/components/MatchPairs';
import type { CardStrength } from '@/lib/cardStrength';
import type { Flashcard, JlptLevel } from '@/types/flashcard';

import { eligibleReadingCards } from '../ReadingMode/eligibility';

export interface KanjiMatchPair extends MatchPair {
  cardId: string;
  jlpt?: JlptLevel;
}

const STRENGTH_RANK: Record<CardStrength, number> = { learning: 0, new: 1, strong: 2 };

/**
 * Scores decoys, so a round pairs しょうがつ with しょうがっこう rather than
 * unrelated words. A hand-rolled heuristic, not a phonetic model.
 */
function readingSimilarity(a: string, b: string): number {
  const left = [...a];
  const right = [...b];
  const shared = new Set(left.filter((ch) => right.includes(ch))).size;
  return (
    (left[0] === right[0] ? 2 : 0) +
    (left[left.length - 1] === right[right.length - 1] ? 1 : 0) +
    (left.length === right.length ? 1 : 0) +
    (shared * 2) / Math.max(left.length, right.length)
  );
}

const LOOKAHEAD = 8;

function clusterByReading(pairs: KanjiMatchPair[]): KanjiMatchPair[] {
  const rest = [...pairs];
  const out: KanjiMatchPair[] = [];
  let current = rest.shift();
  while (current) {
    out.push(current);
    if (rest.length === 0) break;
    let bestIdx = 0;
    let bestScore = -1;
    for (let i = 0; i < Math.min(LOOKAHEAD, rest.length); i += 1) {
      const score = readingSimilarity(current.right, rest[i].right);
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }
    current = rest.splice(bestIdx, 1)[0];
  }
  return out;
}

/**
 * `limit` is applied before clustering, not to the result: clustering reorders
 * the whole list, so trimming after would deal the weakest cards out of the
 * session that surfaced them. No read-aloud text — hearing one tile hands over
 * the match.
 */
export function kanjiMatchPairs(
  cards: Flashcard[],
  strengthOf: (cardId: string) => CardStrength = () => 'new',
  limit?: number,
): KanjiMatchPair[] {
  const seenWord = new Set<string>();
  const seenReading = new Set<string>();
  const pairs: KanjiMatchPair[] = [];

  for (const card of eligibleReadingCards(cards)) {
    const word = card.word.trim();
    const reading = card.reading.trim();
    // 作る/造る would make two tiles right at once, so keep the first only.
    if (seenWord.has(word) || seenReading.has(reading)) continue;
    seenWord.add(word);
    seenReading.add(reading);
    pairs.push({
      key: card.id,
      left: word,
      right: reading,
      cardId: card.id,
      jlpt: card.jlptLevel,
    });
  }

  pairs.sort((a, b) => STRENGTH_RANK[strengthOf(a.cardId)] - STRENGTH_RANK[strengthOf(b.cardId)]);
  return clusterByReading(limit === undefined ? pairs : pairs.slice(0, limit));
}
