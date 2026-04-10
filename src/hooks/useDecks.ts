"use client";
import { useState, useCallback, useEffect } from "react";
import type { Deck } from "@/types/deck";
import {
  dbCreateDeck,
  dbDeleteDeck,
  dbRenameDeck,
  dbUpdateDeckEmoji,
  isConfigured,
  loadDecks,
  showConfigBanner,
} from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export function useDecks() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setDecks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const fetchDecks = async () => {
      const loaded = await loadDecks(user.id);
      setDecks(loaded);
      setLoading(false);
    };

    void fetchDecks();
  }, [user?.id]);

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

  const updateDeckEmoji = useCallback(async (id: string, emoji: string): Promise<void> => {
    const prev = decks.find((d) => d.id === id);
    if (!prev) return;
    setDecks((ds) => ds.map((d) => (d.id === id ? { ...d, emoji } : d)));
    try {
      await dbUpdateDeckEmoji(id, emoji);
    } catch {
      setDecks((ds) => ds.map((d) => (d.id === id ? prev : d)));
    }
  }, [decks]);

  return {
    decks,
    loading,
    createDeck,
    deleteDeck,
    renameDeck,
    updateDeckCount,
    updateDeckEmoji,
  };
}
