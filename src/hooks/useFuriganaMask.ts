import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { cardStrength } from '@/lib/cardStrength';
import { getCardProgressForUser, isConfigured } from '@/lib/supabase';
import type { Flashcard } from '@/types/flashcard';

const EMPTY: ReadonlySet<string> = new Set();

/**
 * Which cards should hide their title furigana this session: the ones the SRS
 * already calls strong. The set is a one-shot snapshot per card list so a
 * reading never pops in or out mid-session; until the fetch lands (or for
 * cards with no progress row) furigana stays visible — help by default.
 */
export function useFuriganaMask(cards: Flashcard[]): (cardId: string) => boolean {
  const { user } = useAuth();
  const [strongIds, setStrongIds] = useState(EMPTY);

  // Only kanji-mode titles carry furigana, so only those rows are worth fetching.
  const idsKey = useMemo(
    () =>
      cards
        .filter((c) => c.mainViewMode === 'kanji')
        .map((c) => c.id)
        .sort()
        .join(','),
    [cards],
  );

  useEffect(() => {
    if (!user?.id || !idsKey || !isConfigured()) return;
    let cancelled = false;
    getCardProgressForUser(user.id, idsKey.split(',')).then((rows) => {
      if (cancelled) return;
      setStrongIds(
        new Set(rows.filter((row) => cardStrength(row) === 'strong').map((row) => row.cardId)),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id, idsKey]);

  return useCallback((cardId: string) => strongIds.has(cardId), [strongIds]);
}
