'use client';
import { useCallback, useState } from 'react';

import type { PendingCard } from '@/components/ReviewCardsDialog/CardRow';

/**
 * Holds the cards waiting in the "Review Cards" step. Every AI path (type a
 * word, import a PDF) hands its results here so the user gets the same chance
 * to edit before anything is written to the deck.
 */
export function useCardReview() {
  const [cards, setCards] = useState<PendingCard[]>([]);
  const [open, setOpen] = useState(false);

  const review = useCallback((next: PendingCard[]) => {
    setCards(next);
    setOpen(true);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  const clear = useCallback(() => {
    setOpen(false);
    setCards([]);
  }, []);

  return { cards, open, review, close, clear };
}
