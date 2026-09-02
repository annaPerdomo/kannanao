'use client';
import { useEffect, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { type CardStrength, cardStrength } from '@/lib/cardStrength';
import { getCardProgressForUser, isConfigured } from '@/lib/supabase';
import type { Flashcard } from '@/types/flashcard';

/**
 * One-shot SRS snapshot: null while unknown. A failed read resolves to an empty
 * map rather than blocking the session on <Loading /> forever.
 */
export function useCardStrengths(cards: Flashcard[]): Map<string, CardStrength> | null {
  const { user } = useAuth();
  const [byCard, setByCard] = useState<Map<string, CardStrength> | null>(null);

  const idsKey = cards
    .map((c) => c.id)
    .sort()
    .join(',');

  useEffect(() => {
    if (!user?.id || !idsKey || !isConfigured()) {
      setByCard(new Map());
      return;
    }
    let cancelled = false;
    getCardProgressForUser(user.id, idsKey.split(','))
      .then((rows) => {
        if (cancelled) return;
        setByCard(new Map(rows.map((row) => [row.cardId, cardStrength(row)])));
      })
      .catch(() => {
        if (!cancelled) setByCard(new Map());
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, idsKey]);

  return byCard;
}
