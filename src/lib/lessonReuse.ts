import type { PlanDeck } from '@/types/lessonPlan';

import { stripFurigana } from './furigana';

/** Words a sentence leans on, in the order they appear in the pool. */
export function reusedWords(exampleJp: string, pool: string[]): string[] {
  if (!exampleJp) return [];
  const plain = stripFurigana(exampleJp);
  const seen = new Set<string>();

  for (const word of pool) {
    if (word && plain.includes(word)) seen.add(word);
  }
  return [...seen];
}

export interface DeckReuse {
  /** Cards whose example sentence uses at least one word the learner already owns. */
  reused: number;
  total: number;
  /** Reuse per card, index-aligned with the deck's cards. */
  perCard: string[][];
}

/**
 * How much of a planned deck builds on what the learner already knows.
 * `pool` is the learner's studied words plus every earlier deck in the plan.
 */
export function deckReuse(deck: PlanDeck, pool: string[]): DeckReuse {
  const cards = deck.cards ?? [];
  const perCard = cards.map((card) => reusedWords(card.exampleJp, pool));

  return {
    reused: perCard.filter((words) => words.length > 0).length,
    total: cards.length,
    perCard,
  };
}

/**
 * Reuse for every deck in plan order. Each deck is measured against the
 * learner's known words plus the words of the decks that come before it —
 * which is exactly the pool the generator was given.
 */
export function planReuse(decks: PlanDeck[], knownWords: string[]): DeckReuse[] {
  const pool = [...knownWords];
  const out: DeckReuse[] = [];

  for (const deck of decks) {
    out.push(deckReuse(deck, pool));
    pool.push(...(deck.cards ?? []).map((c) => c.word).filter(Boolean));
  }
  return out;
}
