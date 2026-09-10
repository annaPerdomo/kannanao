'use client';
import { useEffect, useState } from 'react';

import { isConfigured, loadCards } from '@/lib/supabase';
import type { Flashcard } from '@/types/flashcard';

export function useDeckWords(
  deckId: string | null,
  enabled: boolean,
): { words: Flashcard[]; loading: boolean; error: string | null } {
  const [words, setWords] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setWords([]);
    setError(null);

    if (!enabled || !deckId || !isConfigured()) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const fetchWords = async () => {
      try {
        const loaded = await loadCards(deckId);
        if (cancelled) return;
        setWords(loaded);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchWords();

    return () => {
      cancelled = true;
    };
  }, [deckId, enabled]);

  return { words, loading, error };
}
