import { type CardStrength, cardStrength } from '@/lib/cardStrength';
import type { CardProgress } from '@/lib/supabase';
import type { Flashcard } from '@/types/flashcard';

export interface WordProgressRow {
  userId: string;
  cardId: string;
  correctCount: number;
  wrongCount: number;
  lastReviewedAt: string | null;
  nextReviewAt: string;
  intervalDays: number;
  ease: number;
}

export interface GroupWordInsight {
  card: Flashcard;
  seenCount: number;
  strongCount: number;
  trickyCount: number;
}

export interface LearnerWordInsight {
  card: Flashcard;
  strength: CardStrength;
  correctCount: number;
  wrongCount: number;
  lastReviewedAt: string | null;
  nextReviewAt: string | null;
  intervalDays: number;
  ease: number;
  tricky: boolean;
}

export const TRICKY_MAX_ACCURACY = 0.6;

export function isTricky(correct: number, wrong: number): boolean {
  const total = correct + wrong;
  return total > 0 && correct / total < TRICKY_MAX_ACCURACY;
}

export function groupWordInsights(cards: Flashcard[], rows: WordProgressRow[]): GroupWordInsight[] {
  const byCard = new Map<string, WordProgressRow[]>();
  for (const row of rows) {
    const bucket = byCard.get(row.cardId);
    if (bucket) bucket.push(row);
    else byCard.set(row.cardId, [row]);
  }

  return cards.map((card) => {
    const cardRows = byCard.get(card.id) ?? [];
    let strongCount = 0;
    let trickyCount = 0;
    for (const row of cardRows) {
      if (cardStrength(row) === 'strong') strongCount++;
      if (isTricky(row.correctCount, row.wrongCount)) trickyCount++;
    }
    return { card, seenCount: cardRows.length, strongCount, trickyCount };
  });
}

export function learnerWordInsights(
  cards: Flashcard[],
  rows: WordProgressRow[],
): LearnerWordInsight[] {
  const byCard = new Map(rows.map((row) => [row.cardId, row]));

  return cards.map((card) => {
    const row = byCard.get(card.id);
    if (!row) {
      return {
        card,
        strength: 'new',
        correctCount: 0,
        wrongCount: 0,
        lastReviewedAt: null,
        nextReviewAt: null,
        intervalDays: 0,
        ease: 2.5,
        tricky: false,
      };
    }
    return {
      card,
      strength: cardStrength(row),
      correctCount: row.correctCount,
      wrongCount: row.wrongCount,
      lastReviewedAt: row.lastReviewedAt,
      nextReviewAt: row.nextReviewAt,
      intervalDays: row.intervalDays,
      ease: row.ease,
      tricky: isTricky(row.correctCount, row.wrongCount),
    };
  });
}

export function toCardProgress(insights: LearnerWordInsight[]): CardProgress[] {
  return insights
    .filter((insight) => insight.strength !== 'new')
    .map((insight) => ({
      cardId: insight.card.id,
      correctCount: insight.correctCount,
      wrongCount: insight.wrongCount,
      lastReviewedAt: insight.lastReviewedAt,
      nextReviewAt: insight.nextReviewAt ?? '',
      intervalDays: insight.intervalDays,
      ease: insight.ease,
    }));
}

export function summarizeGroupWords(
  insights: GroupWordInsight[],
  learnerCount: number,
): {
  total: number;
  seenByAnyone: number;
  strongForMost: number;
  trickyForAnyone: number;
} {
  let seenByAnyone = 0;
  let strongForMost = 0;
  let trickyForAnyone = 0;
  for (const insight of insights) {
    if (insight.seenCount > 0) seenByAnyone++;
    if (learnerCount > 0 && insight.strongCount > learnerCount / 2) strongForMost++;
    if (insight.trickyCount > 0) trickyForAnyone++;
  }
  return { total: insights.length, seenByAnyone, strongForMost, trickyForAnyone };
}
