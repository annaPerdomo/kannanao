'use client';
import { Box, Button, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ChoiceGrid } from '@/components/Practice/ChoiceGrid';
import { useSpeech } from '@/hooks/useSpeech';

import { buildDrillPool, buildRomajiChoices, drillOrder, romajiOf } from './kanaDrill';
import { KanaGlyph } from './KanaGlyph';
import { KanaHint } from './KanaHint';
import type { KanaDrillProps } from './types';

const ADVANCE_MS = 1100;

export function RecognizeDrill({ setId, chars, onAnswer, onComplete, unlocked }: KanaDrillProps) {
  const t = useTranslations('KanaJourney.recognize');
  const tCommon = useTranslations('KanaJourney.common');
  const theme = useTheme();
  const { speak } = useSpeech();

  const pool = useMemo(() => buildDrillPool(setId, unlocked), [setId, unlocked]);
  const order = useMemo(() => drillOrder(chars), [chars]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [wrong, setWrong] = useState(false);

  const kana = order[index];
  const choices = useMemo(
    () => (kana ? buildRomajiChoices(kana, pool).map((o) => o.text) : []),
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
      const correct = choice === romajiOf(kana);
      setSelected(choice);
      setWrong(!correct);
      onAnswer(kana, correct);
      // Every utterance here starts from a tap, which is what iOS requires.
      speak(kana);
    },
    [selected, kana, onAnswer, speak],
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

      <KanaGlyph
        kana={kana}
        onPlay={() => speak(kana)}
        playLabel={t('tapToHear')}
        sx={{
          mx: 'auto',
          mb: 2,
          bgcolor: alpha(theme.palette.brand[300], 0.12),
        }}
      />

      <ChoiceGrid
        choices={choices}
        correct={romajiOf(kana)}
        selected={selected}
        onSelect={handleSelect}
      />

      <KanaHint kana={kana} available={wrong} />

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
