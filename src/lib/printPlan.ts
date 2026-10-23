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

/** 32-bit unsigned FNV-1a hash. */
export function hashSeed(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const result = [...items];
  const random = mulberry32(seed);
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Rotates by one when seededShuffle would return the input order, so a shuffled list never comes back unscrambled by chance. */
export function shuffleAvoidingIdentity<T>(items: readonly T[], seed: number): T[] {
  const shuffled = seededShuffle(items, seed);
  if (shuffled.length > 1 && shuffled.every((item, i) => item === items[i])) {
    return [...shuffled.slice(1), shuffled[0]];
  }
  return shuffled;
}

export function safeImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}
