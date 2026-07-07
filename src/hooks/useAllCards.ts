'use client';

import { useEffect, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { isConfigured, loadAllCards } from '@/lib/supabase';
import type { Flashcard } from '@/types/flashcard';

/**
 * Load every card across all decks the signed-in account can access (RLS
 * scopes the query server-side). Used by the review games to practice the
 * user's whole learned vocabulary rather than a single deck.
 */
export function useAllCards() {
  const { user } = useAuth();
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !isConfigured()) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    loadAllCards()
      .then((all) => {
        if (!cancelled) setCards(all);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load cards');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  return { cards, loading, error };
}
