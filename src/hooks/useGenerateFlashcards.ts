'use client';
import { useState, useCallback } from 'react';
import { generateFlashcards, fetchImage } from '@/services/api';
import type { Flashcard } from '@/types/flashcard';

interface UseGenerateResult {
  generating: boolean;
  error: string | null;
  generate: (words: string[], deckId: string) => Promise<Omit<Flashcard, 'id' | 'deckId'>[]>;
}

export function useGenerateFlashcards(): UseGenerateResult {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(
    async (words: string[], deckId: string): Promise<Omit<Flashcard, 'id' | 'deckId'>[]> => {
      setGenerating(true);
      setError(null);
      try {
        const generated = await generateFlashcards({ pendingWords: words });

        // Fetch images in parallel
        const withImages = await Promise.all(
          generated.map(async (card) => {
            const imageUrl = await fetchImage(card.image_query).catch(() => null);
            return {
              ...card,
              imageUrl: imageUrl ?? undefined,
              deckId,
              mainViewMode: 'hiragana' as const,
            };
          }),
        );

        return withImages;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Generation failed';
        setError(msg);
        throw err;
      } finally {
        setGenerating(false);
      }
    },
    [],
  );

  return { generating, error, generate };
}
