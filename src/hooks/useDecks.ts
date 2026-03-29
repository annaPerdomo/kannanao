"use client";
import { useState, useCallback, useEffect } from "react";
import type { Deck } from "@/types/deck";
import {
  dbCreateDeck,
  dbDeleteDeck,
  dbRenameDeck,
  isConfigured,
  loadDecks,
  showConfigBanner,
} from "@/lib/supabase";

export function useDecks() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDecks = async () => {
      const loaded = await loadDecks();
      setDecks(loaded);
      setLoading(false);
    };

    void fetchDecks();
  }, []);

  const createDeck = useCallback(
    async (name: string, description?: string): Promise<Deck> => {
      if (!isConfigured()) {
        showConfigBanner();
        throw new Error("Supabase is not configured");
      }

      const deck = await dbCreateDeck(name, description);
      setDecks((prev) => [...prev, deck]);
      return deck;
    },
    [],
  );

  const deleteDeck = useCallback(async (id: string): Promise<void> => {
    if (!isConfigured()) {
      showConfigBanner();
      throw new Error("Supabase is not configured");
    }

    await dbDeleteDeck(id);
    setDecks((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const updateDeckCount = useCallback((deckId: string, count: number): void => {
    setDecks((prev) =>
      prev.map((d) => (d.id === deckId ? { ...d, cardCount: count } : d)),
    );
  }, []);

  const renameDeck = useCallback(
    async (id: string, name: string, description?: string): Promise<void> => {
      if (!isConfigured()) {
        showConfigBanner();
        throw new Error("Supabase is not configured");
      }

      await dbRenameDeck(id, name, description);

      setDecks((prev) =>
        prev.map((d) =>
          d.id === id
            ? { ...d, name, description: description ?? d.description }
            : d,
        ),
      );
    },
    [],
  );

  return {
    decks,
    loading,
    createDeck,
    deleteDeck,
    renameDeck,
    updateDeckCount,
  };
}
