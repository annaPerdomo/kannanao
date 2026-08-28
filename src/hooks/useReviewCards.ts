'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { type DataError, toDataError } from '@/lib/dataError';
import {
  getAccessibleDeckIds,
  getDueCards,
  isConfigured,
  loadAccessibleCards,
} from '@/lib/supabase';
import type { Flashcard } from '@/types/flashcard';

/**
 * Cards a review game draws from: the account's due cards (SRS, soonest-first)
 * plus their accessible cross-deck collection (own + assigned decks) for top-up. The game picks due-first
 * from these (see `gameWords.orderDueFirst`) so playing a game advances the same
 * review schedule as flip review. Returns the standard data/loading/error shape;
 * empty arrays keep free play working for accounts with nothing due or no cards.
 */
export function useReviewCards(): {
  dueCards: Flashcard[];
  allCards: Flashcard[];
  loading: boolean;
  error: DataError | null;
  errorMessage: string | null;
  retry: () => void;
} {
  const t = useTranslations('Study.useReviewCards');
  const { user } = useAuth();
  const [dueCards, setDueCards] = useState<Flashcard[]>([]);
  const [allCards, setAllCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<DataError | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!user || !isConfigured()) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setError(null);
    setLoading(true);
    // Pull a generous due window so a big backlog can fill a whole session from
    // due cards alone before any top-up is needed. Both reads are scoped to the
    // user's accessible decks (fetched once, shared) so games never surface
    // other groups' material.
    getAccessibleDeckIds(user.id)
      .then((deckIds) =>
        Promise.all([getDueCards(user.id, 100, deckIds), loadAccessibleCards(user.id, deckIds)]),
      )
      .then(([due, all]) => {
        if (cancelled) return;
        setDueCards(due);
        setAllCards(all);
      })
      .catch((e) => {
        // Never `e.message` — it is a gateway body, not learner-readable copy.
        if (!cancelled) setError(toDataError(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, t, reloadKey]);

  const retry = useCallback(() => setReloadKey((n) => n + 1), []);

  return {
    dueCards,
    allCards,
    loading,
    error,
    errorMessage: error ? t('failedToLoadCards') : null,
    retry,
  };
}
