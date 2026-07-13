'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { getDueCards, isConfigured, loadAllCards } from '@/lib/supabase';
import type { Flashcard } from '@/types/flashcard';

/**
 * Cards a review game draws from: the account's due cards (SRS, soonest-first)
 * plus their whole cross-deck collection for top-up. The game picks due-first
 * from these (see `gameWords.orderDueFirst`) so playing a game advances the same
 * review schedule as flip review. Returns the standard data/loading/error shape;
 * empty arrays keep free play working for accounts with nothing due or no cards.
 */
export function useReviewCards(): {
  dueCards: Flashcard[];
  allCards: Flashcard[];
  loading: boolean;
  error: string | null;
} {
  const t = useTranslations('Study.useReviewCards');
  const { user } = useAuth();
  const [dueCards, setDueCards] = useState<Flashcard[]>([]);
  const [allCards, setAllCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !isConfigured()) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    // Pull a generous due window so a big backlog can fill a whole session from
    // due cards alone before any top-up is needed.
    Promise.all([getDueCards(user.id, 100), loadAllCards()])
      .then(([due, all]) => {
        if (cancelled) return;
        setDueCards(due);
        setAllCards(all);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : t('failedToLoadCards'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, t]);

  return { dueCards, allCards, loading, error };
}
