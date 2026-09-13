import type { PendingCard } from '@/components/ReviewCardsDialog';
import type { JlptLevel } from '@/types/flashcard';

import type { ReviewCardValue } from './ReviewCardRow';

export function pendingToReview(card: PendingCard): ReviewCardValue {
  return {
    word: card.word,
    reading: card.reading,
    meaning: card.meaning,
    exampleJp: card.example_jp,
    exampleEn: card.example_en,
    imageQuery: card.image_query,
    imageUrl: card.imageUrl ?? null,
    jlptLevel: card.jlptLevel ?? null,
  };
}

export function reviewPatchToPending(patch: Partial<ReviewCardValue>): Partial<PendingCard> {
  const out: Partial<PendingCard> = {};
  if (patch.word !== undefined) out.word = patch.word;
  if (patch.reading !== undefined) out.reading = patch.reading;
  if (patch.meaning !== undefined) out.meaning = patch.meaning;
  if (patch.exampleJp !== undefined) out.example_jp = patch.exampleJp;
  if (patch.exampleEn !== undefined) out.example_en = patch.exampleEn;
  if (patch.imageQuery !== undefined) out.image_query = patch.imageQuery;
  if (patch.imageUrl !== undefined) out.imageUrl = patch.imageUrl ?? undefined;
  if (patch.jlptLevel !== undefined) {
    out.jlptLevel = (patch.jlptLevel ?? undefined) as JlptLevel | undefined;
  }
  return out;
}
