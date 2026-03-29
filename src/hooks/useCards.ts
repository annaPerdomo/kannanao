"use client";
import { useState, useCallback, useEffect } from "react";
import type { Flashcard } from "@/types/flashcard";
import {
  dbCopyCardsIntoDeck,
  dbDeleteCard,
  dbInsertCards,
  dbUpdateCard,
  isConfigured,
  loadCards,
  showConfigBanner,
} from "@/lib/supabase";

export function useCards(
  deckId: string,
  onCountChange?: (count: number) => void,
) {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCards = async () => {
      const loaded = await loadCards(deckId);
      setCards(loaded);
      onCountChange?.(loaded.length);
      setLoading(false);
    };

    void fetchCards();
  }, [deckId, onCountChange]);

  const addCard = useCallback(
    async (card: Omit<Flashcard, "id">): Promise<Flashcard | undefined> => {
      if (!isConfigured()) {
        showConfigBanner();
        return undefined;
      }

      const [saved] = await dbInsertCards(deckId, [card]);
      if (!saved) return undefined;

      setCards((prev) => {
        const next = [...prev, saved];
        onCountChange?.(next.length);
        return next;
      });

      return saved;
    },
    [deckId, onCountChange],
  );

  const addCards = useCallback(
    async (incoming: Omit<Flashcard, "id">[]): Promise<void> => {
      if (!isConfigured()) {
        showConfigBanner();
        return;
      }

      const savedCards = await dbInsertCards(deckId, incoming);
      setCards((prev) => {
        const next = [...prev, ...savedCards];
        onCountChange?.(next.length);
        return next;
      });
    },
    [deckId, onCountChange],
  );

  const deleteCard = useCallback(
    async (id: string): Promise<void> => {
      if (!isConfigured()) {
        showConfigBanner();
        return;
      }

      await dbDeleteCard(id);
      setCards((prev) => {
        const next = prev.filter((c) => c.id !== id);
        onCountChange?.(next.length);
        return next;
      });
    },
    [onCountChange],
  );

  const updateCard = useCallback(
    async (
      id: string,
      patch: Partial<Flashcard>,
    ): Promise<Flashcard | null> => {
      if (!isConfigured()) {
        showConfigBanner();
        return null;
      }

      const updated = await dbUpdateCard(id, patch);
      if (!updated) return null;

      setCards((prev) => prev.map((c) => (c.id === id ? updated : c)));
      return updated;
    },
    [],
  );

    const copyExistingCards = useCallback(
    async (sourcecards: Flashcard[]): Promise<void> => {
      if (!isConfigured()) {
        showConfigBanner();
        return;
      }
 
      const saved = await dbCopyCardsIntoDeck(deckId, sourcecards);
      setCards((prev) => {
        const next = [...prev, ...saved];
        onCountChange?.(next.length);
        return next;
      });
    },
    [deckId, onCountChange],
  );
 

  return { cards, copyExistingCards, addCard, addCards, deleteCard, updateCard, loading };
}
