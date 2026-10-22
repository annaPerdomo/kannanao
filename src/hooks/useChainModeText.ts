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
      if (!tile) return { label: mode, description: '' };
      const label = tModes(tile.labelKey);
      const questKey = `modeDescriptions.${tile.labelKey.replace(/\.label$/, '')}`;
      const description = tQuest.has(questKey) ? tQuest(questKey) : tModes(tile.descriptionKey);
      return { label, description };
    },
    [tModes, tHero, tKana, tQuest],
  );
}
