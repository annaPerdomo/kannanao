'use client';
import { Box, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { type MatchPairGradeFn, type MatchTile, PairBoard } from '@/components/MatchPairs';

import type { ScriptMatchPair } from './scriptPairs';

interface ScriptMatchDrillProps {
  pairs: ScriptMatchPair[];
  /** A match reports both characters of the pair; a miss reports the two tapped. */
  onAnswer: (kana: string[], correct: boolean) => void;
  onComplete: () => void;
}

function charOf({ pair, side }: MatchTile<ScriptMatchPair>): string {
  return side === 'left' ? pair.hiragana : pair.katakana;
}

export function ScriptMatchDrill({ pairs, onAnswer, onComplete }: ScriptMatchDrillProps) {
  const t = useTranslations('KanaJourney.scriptMatch');

  const handleGrade = useCallback<MatchPairGradeFn<ScriptMatchPair>>(
    (correct, pair, miss) => {
      if (correct && pair) onAnswer([pair.hiragana, pair.katakana], true);
      if (!correct && miss) onAnswer([charOf(miss.selected), charOf(miss.clicked)], false);
    },
    [onAnswer],
  );

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="body2" sx={{ textAlign: 'center', color: 'text.secondary', mb: 2 }}>
        {t('question')}
      </Typography>
      <PairBoard<ScriptMatchPair>
        pairs={pairs}
        variant="japanese"
        onGrade={handleGrade}
        onComplete={() => onComplete()}
      />
    </Box>
  );
}
