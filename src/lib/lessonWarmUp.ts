import type { LessonPlan, PlanDeck, WarmUpWord } from '@/types/lessonPlan';

export function normalizeWord(text: string): string {
  return text.normalize('NFKC').trim();
}

export function splitKnownCards(
  plan: LessonPlan,
  known: WarmUpWord[],
): { plan: LessonPlan; warmUp: WarmUpWord[] } {
  const pool = new Map<string, WarmUpWord>();
  for (const entry of known) {
    const key = normalizeWord(entry.word);
    if (!pool.has(key)) pool.set(key, entry);
  }

  const warmUp: WarmUpWord[] = [];
  const seen = new Set<string>();

  const decks: PlanDeck[] = plan.decks.map((deck) => ({
    ...deck,
    cards: deck.cards.filter((card) => {
      const match = pool.get(normalizeWord(card.word));
      if (!match) return true;

      const key = normalizeWord(match.word);
      if (!seen.has(key)) {
        seen.add(key);
        warmUp.push(match);
      }
      return false;
    }),
  }));

  return { plan: { decks }, warmUp };
}

export function mergeWarmUp(current: WarmUpWord[], next: WarmUpWord[]): WarmUpWord[] {
  const seen = new Set(current.map((entry) => normalizeWord(entry.word)));
  const merged = [...current];

  for (const entry of next) {
    const key = normalizeWord(entry.word);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(entry);
  }

  return merged;
}
