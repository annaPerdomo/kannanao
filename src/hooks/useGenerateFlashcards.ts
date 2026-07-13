'use client';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';

import {
  encodeUnsplashUrl,
  fetchImage,
  generateFlashcards,
  triggerUnsplashDownload,
} from '@/services/api';
import type { Flashcard, MainViewMode } from '@/types/flashcard';

interface UseGenerateResult {
  generating: boolean;
  error: string | null;
  generate: (
    words: string[],
    deckId: string,
    mainViewMode?: MainViewMode,
  ) => Promise<Omit<Flashcard, 'id' | 'deckId' | 'position'>[]>;
}

export function useGenerateFlashcards(): UseGenerateResult {
  const t = useTranslations('Deck.useGenerateFlashcards');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(
    async (
      words: string[],
      deckId: string,
      mainViewMode: MainViewMode = 'hiragana',
    ): Promise<Omit<Flashcard, 'id' | 'deckId' | 'position'>[]> => {
      setGenerating(true);
      setError(null);
      try {
        const generated = await generateFlashcards({ pendingWords: words });

        // Fetch images in parallel
        const withImages = await Promise.all(
          generated.map(async (card) => {
            const result = await fetchImage(card.image_query).catch(() => null);
            if (result) triggerUnsplashDownload(result.downloadLocation);
            return {
              ...card,
              imageUrl: result ? encodeUnsplashUrl(result) : undefined,
              deckId,
              mainViewMode,
              cardType: card.card_type,
              jlptLevel: card.jlpt_level ?? undefined,
            };
          }),
        );

        return withImages;
      } catch (err) {
        const msg = err instanceof Error ? err.message : t('generationFailed');
        setError(msg);
        throw err;
      } finally {
        setGenerating(false);
      }
    },
    [t],
  );

  return { generating, error, generate };
}
