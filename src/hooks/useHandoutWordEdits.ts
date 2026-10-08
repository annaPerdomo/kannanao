'use client';
import { useCallback, useState } from 'react';

import type { HandoutWords } from '@/hooks/useHandoutWords';
import { LESSON_LIBRARY_CACHE_PREFIX } from '@/hooks/useLessonLibrary';
import { invalidateApiCache } from '@/lib/apiCache';
import { dbCopyCardsIntoDeck, dbDeleteCard, dbInsertCards, dbUpdateCard } from '@/lib/supabase';
import type { Flashcard } from '@/types/flashcard';

type NewCard = Omit<Flashcard, 'id' | 'position' | 'deckId'>;

function withAdded(data: HandoutWords, cards: Flashcard[]): HandoutWords {
  return {
    ...data,
    words: [
      ...data.words,
      ...cards.map((card) => ({ card, seenCount: 0, strongCount: 0, trickyCount: 0 })),
    ],
  };
}

export function useHandoutWordEdits(args: {
  deckId: string;
  mutate: (update: (data: HandoutWords) => HandoutWords) => void;
  refetch: () => Promise<void>;
}): {
  saving: boolean;
  error: string | null;
  clearError: () => void;
  updateWord: (card: Flashcard) => Promise<boolean>;
  removeWord: (cardId: string) => Promise<boolean>;
  addWords: (cards: NewCard[]) => Promise<boolean>;
  copyWords: (cards: Flashcard[]) => Promise<boolean>;
} {
  const { deckId, mutate, refetch } = args;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const settle = useCallback(async () => {
    invalidateApiCache(LESSON_LIBRARY_CACHE_PREFIX);
    await refetch();
  }, [refetch]);

  const run = useCallback(
    async (write: () => Promise<void>, rollback?: () => void): Promise<boolean> => {
      setSaving(true);
      setError(null);
      try {
        await write();
        await settle();
        return true;
      } catch (err) {
        rollback?.();
        setError(err instanceof Error ? err.message : String(err));
        await settle();
        return false;
      } finally {
        setSaving(false);
      }
    },
    [settle],
  );

  const updateWord = useCallback(
    (card: Flashcard) => {
      let prev: Flashcard | undefined;
      mutate((data) => ({
        ...data,
        words: data.words.map((w) => {
          if (w.card.id !== card.id) return w;
          prev = w.card;
          return { ...w, card };
        }),
      }));
      return run(
        async () => {
          const saved = await dbUpdateCard(card.id, card);
          if (!saved) throw new Error('update failed');
        },
        () =>
          mutate((data) => ({
            ...data,
            words: data.words.map((w) =>
              w.card.id === card.id && prev ? { ...w, card: prev } : w,
            ),
          })),
      );
    },
    [mutate, run],
  );

  const removeWord = useCallback(
    (cardId: string) => {
      let snapshot: HandoutWords | null = null;
      mutate((data) => {
        snapshot = data;
        return { ...data, words: data.words.filter((w) => w.card.id !== cardId) };
      });
      return run(
        () => dbDeleteCard(cardId),
        () => mutate((data) => snapshot ?? data),
      );
    },
    [mutate, run],
  );

  const addWords = useCallback(
    (cards: NewCard[]) =>
      run(async () => {
        const saved = await dbInsertCards(
          deckId,
          cards.map((c) => ({ ...c, deckId })),
        );
        if (saved.length === 0 && cards.length > 0) throw new Error('insert failed');
        mutate((data) => withAdded(data, saved));
      }),
    [deckId, mutate, run],
  );

  const copyWords = useCallback(
    (cards: Flashcard[]) =>
      run(async () => {
        const saved = await dbCopyCardsIntoDeck(deckId, cards);
        mutate((data) => withAdded(data, saved));
      }),
    [deckId, mutate, run],
  );

  const clearError = useCallback(() => setError(null), []);

  return { saving, error, clearError, updateWord, removeWord, addWords, copyWords };
}
