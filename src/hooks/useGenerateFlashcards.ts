'use client';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';

import { generateFlashcards } from '@/services/api';
import { type NewCard, withImages } from '@/services/cardPipeline';
import type { MainViewMode } from '@/types/flashcard';

interface UseGenerateResult {
  generating: boolean;
  error: string | null;
  generate: (words: string[], deckId: string, mainViewMode?: MainViewMode) => Promise<NewCard[]>;
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
    ): Promise<NewCard[]> => {
      setGenerating(true);
      setError(null);
      try {
        const generated = await generateFlashcards({ pendingWords: words });
        return await withImages(generated, deckId, mainViewMode);
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
