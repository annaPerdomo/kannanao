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
  regenerate: (
    words: string[],
    instruction: string,
    deckId: string,
    mainViewMode?: MainViewMode,
  ) => Promise<NewCard[]>;
}

export function useGenerateFlashcards(): UseGenerateResult {
  const t = useTranslations('Deck.useGenerateFlashcards');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (
      words: string[],
      deckId: string,
      mainViewMode: MainViewMode,
      options: { expandTopics: boolean; instruction?: string },
    ): Promise<NewCard[]> => {
      setGenerating(true);
      setError(null);
      try {
        const generated = await generateFlashcards({ pendingWords: words, ...options });
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

  const generate = useCallback(
    (words: string[], deckId: string, mainViewMode: MainViewMode = 'hiragana') =>
      run(words, deckId, mainViewMode, { expandTopics: true }),
    [run],
  );

  /**
   * Redo a set of cards the reviewer wasn't happy with. Expansion stays off so
   * the result lines up one-for-one with the rows being replaced — the words
   * are already specific, and a topic reading of one of them would shift every
   * row after it.
   */
  const regenerate = useCallback(
    (
      words: string[],
      instruction: string,
      deckId: string,
      mainViewMode: MainViewMode = 'hiragana',
    ) => run(words, deckId, mainViewMode, { expandTopics: false, instruction }),
    [run],
  );

  return { generating, error, generate, regenerate };
}
