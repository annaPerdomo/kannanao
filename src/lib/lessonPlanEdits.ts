import type { LessonPlan, PlanCard, PlanDeck } from '@/types/lessonPlan';

export function emptyPlanCard(): PlanCard {
  return { word: '', reading: '', meaning: '', exampleJp: '', exampleEn: '', jlptLevel: null };
}

export function cardIsBlank(card: PlanCard): boolean {
  return card.word.trim().length === 0;
}

/** Cards this deck would actually create: ticked and not blank. */
export function includedCards(deck: PlanDeck): PlanCard[] {
  return (deck.cards ?? []).filter((card) => !card.excluded && !cardIsBlank(card));
}

/** A deck is skipped when unticked itself, or when every one of its cards is. */
export function deckIsSkipped(deck: PlanDeck): boolean {
  return Boolean(deck.excluded) || includedCards(deck).length === 0;
}

/** What apply should receive: skipped decks and unticked cards gone, tick flags stripped. */
export function includedPlan(plan: LessonPlan): LessonPlan {
  return {
    decks: plan.decks
      .filter((deck) => !deckIsSkipped(deck))
      .map(({ excluded: _deckFlag, ...deck }) => ({
        ...deck,
        cards: includedCards(deck).map(({ excluded: _cardFlag, ...card }) => card),
      })),
  };
}

export function planCounts(plan: LessonPlan): { decks: number; cards: number } {
  const kept = includedPlan(plan);
  return {
    decks: kept.decks.length,
    cards: kept.decks.reduce((sum, deck) => sum + deck.cards.length, 0),
  };
}

/**
 * Week numbers as apply will see them: skipped decks get null, the rest are
 * renumbered 1..N in order — the same order their due dates are computed in.
 */
export function weekNumbers(decks: PlanDeck[]): (number | null)[] {
  let week = 0;
  return decks.map((deck) => (deckIsSkipped(deck) ? null : ++week));
}

/** Plain YYYY-MM-DD arithmetic in UTC, mirroring the apply route. Null on a bad date. */
export function addDaysToDate(date: string, days: number): string | null {
  const start = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(start)) return null;
  return new Date(start + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
