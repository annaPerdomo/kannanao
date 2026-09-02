'use client';
import { Box, Chip, LinearProgress, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ChoiceGrid } from '@/components/Practice/ChoiceGrid';
import { useSpeech } from '@/hooks/useSpeech';

import { buildDrillPool, buildRomajiChoices, drillOrder, romajiOf } from './kanaDrill';
import { KanaGlyph } from './KanaGlyph';
import type { KanaDrillProps } from './types';

export const LIGHTNING_SECONDS = 45;
const TICK_MS = 250;
const ADVANCE_MS = 450;

export function LightningRound({ chars, onAnswer, onComplete, decoyPool }: KanaDrillProps) {
  const t = useTranslations('KanaJourney.lightning');
  const theme = useTheme();
  const { speak } = useSpeech();

  const pool = useMemo(() => buildDrillPool(chars, decoyPool), [chars, decoyPool]);
  // Enough repeats that the clock, not the question stream, ends the round even
  // when the learner answers at the ADVANCE_MS floor.
  const order = useMemo(
    () =>
      drillOrder(
        chars,
        Math.ceil((LIGHTNING_SECONDS * 1000) / ADVANCE_MS / Math.max(1, chars.length)) + 2,
      ),
    [chars],
  );

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);

  const done = elapsedMs >= LIGHTNING_SECONDS * 1000 || index >= order.length;
  const kana = done ? undefined : order[index];
  const choices = useMemo(
    () => (kana ? buildRomajiChoices(kana, pool).map((o) => o.text) : []),
    [kana, pool],
  );

  useEffect(() => {
    if (done) return;
    const timer = setInterval(() => setElapsedMs((ms) => ms + TICK_MS), TICK_MS);
    return () => clearInterval(timer);
  }, [done]);

  const completedRef = useRef(false);
  useEffect(() => {
    if (done && !completedRef.current) {
      completedRef.current = true;
      onComplete();
    }
  }, [done, onComplete]);

  const handleSelect = useCallback(
    (choice: string) => {
      if (selected || !kana) return;
      const correct = choice === romajiOf(kana);
      setSelected(choice);
      if (correct) setScore((s) => s + 1);
      onAnswer(kana, correct);
      speak(kana);
    },
    [selected, kana, onAnswer, speak],
  );

  useEffect(() => {
    if (!selected) return;
    const timer = setTimeout(() => {
      setSelected(null);
      setIndex((i) => i + 1);
    }, ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [selected]);

  const pct = Math.min(100, (elapsedMs / (LIGHTNING_SECONDS * 1000)) * 100);

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <LinearProgress
          variant="determinate"
          value={pct}
          aria-label={t('timeLeft')}
          sx={{
            flex: 1,
            height: 10,
            borderRadius: 5,
            bgcolor: alpha(theme.palette.brand[300], 0.15),
            '& .MuiLinearProgress-bar': { bgcolor: 'primary.main', borderRadius: 5 },
          }}
        />
        <Chip label={t('score', { count: score })} />
      </Box>

      {done ? (
        <Typography variant="h6" sx={{ textAlign: 'center', py: 4 }}>
          {t('timeUp', { count: score })}
        </Typography>
      ) : (
        kana && (
          <>
            <KanaGlyph
              kana={kana}
              onPlay={() => speak(kana)}
              playLabel={t('tapToHear')}
              sx={{ mx: 'auto', mb: 2, bgcolor: alpha(theme.palette.brand[300], 0.12) }}
            />
            <ChoiceGrid
              choices={choices}
              correct={romajiOf(kana)}
              selected={selected}
              onSelect={handleSelect}
            />
          </>
        )
      )}
    </Box>
  );
}
