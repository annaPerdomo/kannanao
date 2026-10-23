'use client';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { goalModeMessageKey } from '@/components/Group/useGoalLabel';
import type { ChainMode } from '@/lib/practiceChain';

export function useModeName(): (mode: ChainMode) => string {
  const t = useTranslations('Group.goalPicker');
  return useCallback((mode: ChainMode) => t(`modes.${goalModeMessageKey(mode)}`), [t]);
}
