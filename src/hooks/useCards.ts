'use client';
import { useCallback, useEffect, useState } from 'react';

import { type DataError, toDataError } from '@/lib/dataError';
import {
  dbCopyCardsIntoDeck,
  dbDeleteCard,
  dbInsertCards,
  dbReorderCards,
  dbSetCardsMainViewMode,
  dbUpdateCard,
  isConfigured,
  loadCards,
  showConfigBanner,
} from '@/lib/supabase';
import type { Flashcard, MainViewMode } from '@/types/flashcard';

export function useCards(deckId: string, onCountChange?: (count: number) => void) {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<DataError | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError(null);

    const fetchCards = async () => {
      try {
        const loaded = await loadCards(deckId);
        if (cancelled) return;
        setCards(loaded);
        onCountChange?.(loaded.length);
      } catch (err) {
        // A deck with no cards and a deck that failed to load are different
        // states; don't let the second render as the first.
        if (!cancelled) setError(toDataError(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchCards();

    return () => {
      cancelled = true;
    };
  }, [deckId, onCountChange, reloadKey]);

  const retry = useCallback(() => setReloadKey((n) => n + 1), []);

  const addCard = useCallback(
    async (card: Omit<Flashcard, 'id' | 'position'>): Promise<Flashcard | undefined> => {
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
    async (incoming: Omit<Flashcard, 'id' | 'position'>[]): Promise<void> => {
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
    async (id: string, patch: Partial<Flashcard>): Promise<Flashcard | null> => {
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

  const reorderCards = useCallback(
    async (reordered: Flashcard[]): Promise<void> => {
      const updated = reordered.map((c, i) => ({ ...c, position: i }));
      const prev = cards;
      setCards(updated);
      try {
        await dbReorderCards(updated.map((c) => c.id));
      } catch {
        setCards(prev);
      }
    },
    [cards],
  );

  const setAllMainViewMode = useCallback(
    async (mode: MainViewMode): Promise<void> => {
      if (!isConfigured()) {
        showConfigBanner();
        return;
      }

      const prev = cards;
      setCards(prev.map((c) => (c.mainViewMode === mode ? c : { ...c, mainViewMode: mode })));
      try {
        await dbSetCardsMainViewMode(deckId, mode);
      } catch (err) {
        setCards(prev);
        throw err;
      }
    },
    [cards, deckId],
  );

  return {
    cards,
    copyExistingCards,
    addCard,
    addCards,
    deleteCard,
    updateCard,
    reorderCards,
    setAllMainViewMode,
    loading,
    error,
    retry,
  };
}
