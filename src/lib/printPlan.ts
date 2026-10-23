import type { LessonPlan, PlanCard, PlanDeck } from '@/types/lessonPlan';

import { furiganaFromReading } from './furigana';
import { escapeHtml, furiganaToRubyHtml } from './lessonPrintable';
import { isPureKana } from './reviewGames';

/** Never mutates the plan — returns new deck/card objects. */
export function printableDecks(plan: LessonPlan): PlanDeck[] {
  return plan.decks
    .filter((deck) => !deck.excluded)
    .map((deck) => ({ ...deck, cards: deck.cards.filter((card) => !card.excluded) }))
    .filter((deck) => deck.cards.length > 0);
}

export function frontText(deck: PlanDeck, card: PlanCard): string {
  return deck.mainViewMode === 'hiragana' && card.reading ? card.reading : card.word;
}

export function frontHtml(deck: PlanDeck, card: PlanCard, furigana: boolean): string {
  const text = frontText(deck, card);
  if (furigana && text === card.word && !isPureKana(text)) {
    const marked = furiganaFromReading(card.word, card.reading);
    return furiganaToRubyHtml(marked ?? card.word);
  }
  return escapeHtml(text);
}

export function safeImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}
