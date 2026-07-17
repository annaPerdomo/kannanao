'use client';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { type GoalMode, isGoalMode, type MasteryCriteria } from '@/lib/assignmentMastery';

/** Message key for a goal mode under Group.goalPicker.modes ('kotoba-bubble' → 'kotobaBubble'). */
export function goalModeMessageKey(mode: GoalMode): string {
  return mode.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

/**
 * Locale-aware counterpart of `goalLabel` from `@/lib/assignmentMastery`:
 * composes "80% in Match" / "80%" / "practice in Match" from the
 * Group.goalPicker namespace so goal text follows the active UI language.
 */
export function useGoalLabel() {
  const t = useTranslations('Group.goalPicker');
  return useCallback(
    (criteria: MasteryCriteria): string | null => {
      const { required_accuracy, required_mode } = criteria;
      if (required_accuracy == null && required_mode == null) return null;
      const modeName = required_mode
        ? isGoalMode(required_mode)
          ? t(`modes.${goalModeMessageKey(required_mode)}`)
          : required_mode
        : null;
      if (required_accuracy != null && modeName) {
        return t('goalBoth', { accuracy: required_accuracy, mode: modeName });
      }
      if (required_accuracy != null) return t('goalAccuracyOnly', { accuracy: required_accuracy });
      return t('goalModeOnly', { mode: modeName ?? '' });
    },
    [t],
  );
}
