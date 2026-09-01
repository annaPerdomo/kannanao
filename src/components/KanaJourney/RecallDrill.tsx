'use client';
import { Box, Button, Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { SpeakButton } from '@/components/SpeakButton';

import { buildDrillPool, buildKanaChoices, drillOrder, romajiOf } from './kanaDrill';
import { KanaHint } from './KanaHint';
import { KanaTileGrid } from './KanaTileGrid';
import type { KanaDrillProps } from './types';

const ADVANCE_MS = 1100;

export function RecallDrill({ setId, chars, onAnswer, onComplete, unlocked }: KanaDrillProps) {
  const t = useTranslations('KanaJourney.recall');
  const tCommon = useTranslations('KanaJourney.common');

  const pool = useMemo(() => buildDrillPool(setId, unlocked), [setId, unlocked]);
  const order = useMemo(() => drillOrder(chars), [chars]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [wrong, setWrong] = useState(false);

  const kana = order[index];
  const choices = useMemo(
    () => (kana ? buildKanaChoices(kana, pool).map((o) => o.text) : []),
    [kana, pool],
  );

  const completedRef = useRef(false);
  useEffect(() => {
    if (index >= order.length && !completedRef.current) {
      completedRef.current = true;
      onComplete();
    }
  }, [index, order.length, onComplete]);

  const next = useCallback(() => {
    setSelected(null);
    setWrong(false);
    setIndex((i) => i + 1);
  }, []);

  const handleSelect = useCallback(
    (choice: string) => {
      if (selected || !kana) return;
      // Graded on the sound, not the character: じ and ぢ read the same, so a
      // tile that says the prompt is right even when it isn't the same glyph.
      const correct = romajiOf(choice) === romajiOf(kana);
      setSelected(choice);
      setWrong(!correct);
      onAnswer(kana, correct);
    },
    [selected, kana, onAnswer],
  );

  useEffect(() => {
    if (!selected || wrong) return;
    const timer = setTimeout(next, ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [selected, wrong, next]);

  if (!kana) return null;

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="body2" sx={{ textAlign: 'center', color: 'text.secondary', mb: 1 }}>
        {t('question')}
      </Typography>

      <Stack direction="row" alignItems="center" justifyContent="center" spacing={1} sx={{ mb: 3 }}>
        <Typography sx={{ fontSize: { xs: '2.5rem', sm: '3rem' }, lineHeight: 1, fontWeight: 600 }}>
          {romajiOf(kana)}
        </Typography>
        <SpeakButton text={kana} iconSize="1.6rem" />
      </Stack>

      <KanaTileGrid choices={choices} correct={kana} selected={selected} onSelect={handleSelect} />

      <Box sx={{ mt: 2 }}>
        <KanaHint kana={kana} available={wrong} />
      </Box>

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
