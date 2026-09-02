import type { PlanDeck, WarmUpWord } from '@/types/lessonPlan';

import { stripFurigana } from './furigana';
import { cardIsBlank, deckIsSkipped, includedCards } from './lessonPlanEdits';

/** Pool words a sentence leans on, in the order they appear in the pool. */
export function reusedWords(exampleJp: string, pool: WarmUpWord[]): WarmUpWord[] {
  if (!exampleJp) return [];
  const plain = stripFurigana(exampleJp);
  const seen = new Set<string>();
  const matches: WarmUpWord[] = [];

  for (const source of pool) {
    if (source.word && !seen.has(source.word) && plain.includes(source.word)) {
      seen.add(source.word);
      matches.push(source);
    }
  }
  return matches;
}

export interface DeckReuse {
  /** Cards whose example sentence uses at least one word the learner already owns. */
  reused: number;
  total: number;
  /** Reuse per card, index-aligned with the deck's cards. */
  perCard: WarmUpWord[][];
}

/**
 * How much of a planned deck builds on what the learner already knows.
 * `pool` is the learner's studied words plus every earlier deck in the plan.
 * perCard stays index-aligned with every card for display; the counts cover
 * only cards that will actually be created.
 */
export function deckReuse(deck: PlanDeck, pool: WarmUpWord[]): DeckReuse {
  const cards = deck.cards ?? [];
  const perCard = cards.map((card) => reusedWords(card.exampleJp, pool));

  let reused = 0;
  let total = 0;
  cards.forEach((card, i) => {
    if (card.excluded || cardIsBlank(card)) return;
    total += 1;
    if (perCard[i].length > 0) reused += 1;
  });

  return { reused, total, perCard };
}

/**
 * Reuse for every deck in plan order. Each deck is measured against the
 * learner's known words plus the words of the decks that come before it —
 * only words that will actually be created feed the pool.
 */
export function planReuse(decks: PlanDeck[], knownWords: WarmUpWord[]): DeckReuse[] {
  const pool = [...knownWords];
  const out: DeckReuse[] = [];

  for (const deck of decks) {
    out.push(deckReuse(deck, pool));
    if (deckIsSkipped(deck)) continue;
    pool.push(
      ...includedCards(deck).map((c) => ({
        word: c.word,
        reading: c.reading,
        meaning: c.meaning,
        deckName: deck.name,
        addedAt: null,
      })),
    );
  }
  return out;
}
