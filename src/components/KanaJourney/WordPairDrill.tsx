'use client';
import { Box, Button, Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { SpeakButton } from '@/components/SpeakButton';
import { shuffle } from '@/lib/reviewGames';

import { KanaTileGrid } from './KanaTileGrid';
import type { KanaDrillProps } from './types';
import { pairsFor } from './wordPairs';

const ADVANCE_MS = 1300;

export function WordPairDrill({ chars, onAnswer, onComplete }: KanaDrillProps) {
  const t = useTranslations('KanaJourney.wordPair');
  const tCommon = useTranslations('KanaJourney.common');

  const pairs = useMemo(() => pairsFor(chars), [chars]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [wrong, setWrong] = useState(false);

  const pair = pairs[index];
  const choices = useMemo(() => (pair ? shuffle([pair.word, pair.decoy]) : []), [pair]);

  const completedRef = useRef(false);
  useEffect(() => {
    if (index >= pairs.length && !completedRef.current) {
      completedRef.current = true;
      onComplete();
    }
  }, [index, pairs.length, onComplete]);

  const next = useCallback(() => {
    setSelected(null);
    setWrong(false);
    setIndex((i) => i + 1);
  }, []);

  const handleSelect = useCallback(
    (choice: string) => {
      if (selected || !pair) return;
      const correct = choice === pair.word;
      setSelected(choice);
      setWrong(!correct);
      for (const kana of pair.chars) onAnswer(kana, correct);
    },
    [selected, pair, onAnswer],
  );

  useEffect(() => {
    if (!selected || wrong) return;
    const timer = setTimeout(next, ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [selected, wrong, next]);

  if (!pair) return null;

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="body2" sx={{ textAlign: 'center', color: 'text.secondary', mb: 1 }}>
        {t('question')}
      </Typography>

      {/* Playback stays behind this tap: iOS refuses speech that no gesture started. */}
      <Stack direction="row" alignItems="center" justifyContent="center" spacing={1} sx={{ mb: 3 }}>
        <Typography sx={{ fontSize: { xs: '1.6rem', sm: '2rem' }, lineHeight: 1, fontWeight: 600 }}>
          {t('listen')}
        </Typography>
        <SpeakButton text={pair.word} iconSize="2rem" />
      </Stack>

      <KanaTileGrid
        choices={choices}
        correct={pair.word}
        selected={selected}
        onSelect={handleSelect}
      />

      {wrong && (
        <Box sx={{ textAlign: 'center', mt: 1 }}>
          <Button variant="contained" onClick={next}>
            {tCommon('next')}
          </Button>
        </Box>
      )}
    </Box>
  );
}
