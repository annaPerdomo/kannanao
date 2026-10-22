'use client';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import { useTranslations } from 'next-intl';

import { BONUS_XP } from '@/lib/bonusRound';
import { FRIENDSHIP_POINTS } from '@/lib/friendship';

export interface BonusChipsProps {
  buddyName: string;
  /** Hidden once the 'bonus' source has already paid today. */
  showHearts: boolean;
}

export function BonusChips({ buddyName, showHearts }: BonusChipsProps) {
  const t = useTranslations('PracticeDone.done');
  return (
    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
      {showHearts && (
        <Chip
          size="small"
          label={t('bonusHearts', { n: FRIENDSHIP_POINTS.bonus, buddy: buddyName })}
        />
      )}
      <Chip size="small" label={t('bonusXp', { xp: BONUS_XP })} />
    </Box>
  );
}
