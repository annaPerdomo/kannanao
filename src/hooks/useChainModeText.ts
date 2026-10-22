'use client';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { PRACTICE_CONFIG } from '@/components/Deck/constants';
import type { ChainMode } from '@/lib/practiceChain';

export function useChainModeText(): (mode: ChainMode) => { label: string; description: string } {
  const tModes = useTranslations('Deck.practiceModes');
  const tHero = useTranslations('Deck.practiceHero');
  const tKana = useTranslations('KanaJourney.journey');
  const tQuest = useTranslations('AssignmentQuest');

  return useCallback(
    (mode: ChainMode) => {
      if (mode === 'study') {
        return { label: tHero('flashcardsTitle'), description: tHero('flashcardsDescription') };
      }
      if (mode === 'kana-journey') {
        return { label: tKana('title'), description: tQuest('modeDescriptions.kanaJourney') };
      }
      if (mode === 'review') {
        return {
          label: tQuest('stepName.review'),
          description: tQuest('modeDescriptions.review'),
        };
      }
      const tile = PRACTICE_CONFIG.find((config) => config.mode === mode);
      return tile
        ? { label: tModes(tile.labelKey), description: tModes(tile.descriptionKey) }
        : { label: mode, description: '' };
    },
    [tModes, tHero, tKana, tQuest],
  );
}
