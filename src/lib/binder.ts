import type { CardProgress } from '@/lib/supabase';
import type { Deck } from '@/types/deck';
import type { Flashcard, JlptLevel } from '@/types/flashcard';

import { type CardStrength, cardStrength } from './cardStrength';

export interface BinderCard {
  card: Flashcard;
  strength: CardStrength;
  progress: CardProgress | null;
  /** Lesson tab index; the sort key that keeps lesson order on the All tab. */
  lesson: number;
}

export interface BinderTab {
  deck: Deck;
  cards: BinderCard[];
  collected: number;
  strong: number;
}

export function buildBinder(
  decks: Deck[],
  cards: Flashcard[],
  progress: CardProgress[],
): BinderTab[] {
  const byCard = new Map(progress.map((row) => [row.cardId, row]));
  const lessonOf = new Map(decks.map((deck, i) => [deck.id, i]));
  const byDeck = new Map<string, BinderCard[]>();
  for (const card of cards) {
    const row = byCard.get(card.id) ?? null;
    const entry: BinderCard = {
      card,
      strength: cardStrength(row ?? undefined),
      progress: row,
      lesson: lessonOf.get(card.deckId) ?? Number.MAX_SAFE_INTEGER,
    };
    const list = byDeck.get(card.deckId);
    if (list) list.push(entry);
    else byDeck.set(card.deckId, [entry]);
  }
  return decks
    .filter((deck) => byDeck.has(deck.id))
    .map((deck) => {
      const list = byDeck.get(deck.id)!;
      return {
        deck,
        cards: list,
        collected: list.filter((c) => c.strength !== 'new').length,
        strong: list.filter((c) => c.strength === 'strong').length,
      };
    });
}

export type StrengthFilter = 'all' | CardStrength;
export type TypeFilter = 'all' | 'word' | 'phrase';
export type BinderSort = 'lesson' | 'strongest' | 'weakest' | 'newest' | 'reading' | 'missed';

export interface BinderFilters {
  query: string;
  strength: StrengthFilter;
  jlpt: JlptLevel | 'all';
  type: TypeFilter;
  sort: BinderSort;
}

export const DEFAULT_FILTERS: BinderFilters = {
  query: '',
  strength: 'all',
  jlpt: 'all',
  type: 'all',
  sort: 'lesson',
};

export const STRENGTH_ORDER: Record<CardStrength, number> = { strong: 0, learning: 1, new: 2 };

function matchesQuery(card: Flashcard, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [card.word, card.reading, card.meaning, card.romaji ?? '', card.example_jp].some((s) =>
    s.toLowerCase().includes(q),
  );
}

export function filterBinderCards(cards: BinderCard[], filters: BinderFilters): BinderCard[] {
  const kept = cards.filter(
    ({ card, strength }) =>
      (filters.strength === 'all' || strength === filters.strength) &&
      (filters.jlpt === 'all' || card.jlptLevel === filters.jlpt) &&
      (filters.type === 'all' || card.cardType === filters.type) &&
      matchesQuery(card, filters.query),
  );
  return sortBinderCards(kept, filters.sort);
}

const lastReviewed = (c: BinderCard) =>
  c.progress?.lastReviewedAt ? Date.parse(c.progress.lastReviewedAt) : 0;
const missRate = (c: BinderCard) => {
  if (!c.progress) return -1;
  const total = c.progress.correctCount + c.progress.wrongCount;
  return total === 0 ? -1 : c.progress.wrongCount / total;
};

export function sortBinderCards(cards: BinderCard[], sort: BinderSort): BinderCard[] {
  const list = [...cards];
  switch (sort) {
    case 'lesson':
      return list.sort((a, b) => a.lesson - b.lesson || a.card.position - b.card.position);
    case 'strongest':
      return list.sort(
        (a, b) =>
          STRENGTH_ORDER[a.strength] - STRENGTH_ORDER[b.strength] ||
          (b.progress?.intervalDays ?? 0) - (a.progress?.intervalDays ?? 0),
      );
    case 'weakest':
      return list.sort(
        (a, b) =>
          STRENGTH_ORDER[b.strength] - STRENGTH_ORDER[a.strength] ||
          (a.progress?.intervalDays ?? 0) - (b.progress?.intervalDays ?? 0),
      );
    case 'newest':
      return list.sort((a, b) => lastReviewed(b) - lastReviewed(a));
    case 'reading':
      return list.sort((a, b) => a.card.reading.localeCompare(b.card.reading, 'ja'));
    case 'missed':
      return list.sort((a, b) => missRate(b) - missRate(a));
  }
}

export function jlptLevelsIn(cards: BinderCard[]): JlptLevel[] {
  const order: JlptLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];
  const present = new Set(cards.map((c) => c.card.jlptLevel).filter(Boolean));
  return order.filter((level) => present.has(level));
}

export function hasPhrases(cards: BinderCard[]): boolean {
  return cards.some((c) => c.card.cardType === 'phrase');
}
