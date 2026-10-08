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

export interface HandoutLearnerSummary {
  id: string;
  name: string;
  assigned: boolean;
  strong: number;
  learning: number;
  unseen: number;
  tricky: number;
  lastPracticedAt: string | null;
}

export function handoutLearnerSummaries(
  cards: Flashcard[],
  rows: WordProgressRow[],
  members: { id: string; name: string }[],
  assignedIds: Set<string>,
): HandoutLearnerSummary[] {
  const byUser = new Map<string, WordProgressRow[]>();
  for (const row of rows) {
    const bucket = byUser.get(row.userId);
    if (bucket) bucket.push(row);
    else byUser.set(row.userId, [row]);
  }

  return members.map((member) => {
    const insights = learnerWordInsights(cards, byUser.get(member.id) ?? []);
    let strong = 0;
    let learning = 0;
    let unseen = 0;
    let tricky = 0;
    let lastPracticedAt: string | null = null;
    for (const insight of insights) {
      if (insight.strength === 'strong') strong++;
      else if (insight.strength === 'learning') learning++;
      else unseen++;
      if (insight.tricky) tricky++;
      if (
        insight.lastReviewedAt &&
        (!lastPracticedAt || insight.lastReviewedAt > lastPracticedAt)
      ) {
        lastPracticedAt = insight.lastReviewedAt;
      }
    }
    return {
      id: member.id,
      name: member.name,
      assigned: assignedIds.has(member.id),
      strong,
      learning,
      unseen,
      tricky,
      lastPracticedAt,
    };
  });
}

export type MasteryLevel = 'notStarted' | 'learning' | 'gettingThere' | 'mastered';

export const MASTERED_SHARE = 0.8;
export const GETTING_THERE_SHARE = 0.4;

/** Share of the handout's words that are strong; `percent` is 0–100, rounded. */
export function masteryOf(summary: Pick<HandoutLearnerSummary, 'strong' | 'learning' | 'unseen'>): {
  level: MasteryLevel;
  percent: number;
} {
  const total = summary.strong + summary.learning + summary.unseen;
  const share = total > 0 ? summary.strong / total : 0;
  const percent = Math.round(share * 100);
  if (summary.strong + summary.learning === 0) return { level: 'notStarted', percent };
  if (share >= MASTERED_SHARE) return { level: 'mastered', percent };
  if (share >= GETTING_THERE_SHARE) return { level: 'gettingThere', percent };
  return { level: 'learning', percent };
}
