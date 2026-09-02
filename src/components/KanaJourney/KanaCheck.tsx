'use client';
import { Box, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { GameShell } from '@/components/Games/GameShell';
import { CelebrationScreen, pickPraise } from '@/components/Practice/CelebrationScreen';
import { ChoiceGrid } from '@/components/Practice/ChoiceGrid';
import { useGameSession } from '@/hooks/useGameSession';
import { useSpeech } from '@/hooks/useSpeech';
import {
  gradeKanaCheck,
  type KanaProgressMap,
  pickKanaCheck,
  pickReviewQueue,
} from '@/lib/kanaProficiency';

import { KANA_XP } from './constants';
import { buildDrillPool, buildRomajiChoices, romajiOf } from './kanaDrill';
import { KanaGlyph } from './KanaGlyph';

const ADVANCE_MS = 700;

const RESULT_WORK_ON = 3;

interface KanaCheckProps {
  byKana: KanaProgressMap;
  /** Writes one graded answer to kana_progress; never throws. */
  record: (kana: string, correct: boolean) => Promise<void>;
  onExit: () => void;
  /** Called from the result screen: the check hands the learner straight to Review. */
  onReview: () => void;
}

export function KanaCheck({ byKana, record, onExit, onReview }: KanaCheckProps) {
  const t = useTranslations('KanaJourney.check');
  const theme = useTheme();
  const { speak } = useSpeech();
  const { answer, finish } = useGameSession('kana-journey', { correctXp: KANA_XP, kanaSet: null });

  const [questions] = useState(() => pickKanaCheck());
  const pool = useMemo(() => buildDrillPool(questions), [questions]);

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const rightRef = useRef(0);
  const writesRef = useRef<Promise<unknown>[]>([]);
  const finishedRef = useRef(false);

  // A local mirror advanced as answers land: byKana only updates a render
  // later, so grading off it could seed the same character twice.
  const progressRef = useRef<KanaProgressMap>(new Map(byKana));

  const noteAnswer = useCallback((graded: string, correct: boolean) => {
    const prior = progressRef.current.get(graded);
    progressRef.current.set(graded, {
      correctCount: (prior?.correctCount ?? 0) + (correct ? 1 : 0),
      wrongCount: (prior?.wrongCount ?? 0) + (correct ? 0 : 1),
    });
  }, []);

  const kana = questions[index];
  const choices = useMemo(
    () => (kana ? buildRomajiChoices(kana, pool).map((o) => o.text) : []),
    [kana, pool],
  );

  const endRun = useCallback(async () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    await Promise.allSettled(writesRef.current);
    await finish();
    setDone(true);
  }, [finish]);

  useEffect(() => {
    if (index >= questions.length) void endRun();
  }, [index, questions.length, endRun]);

  const handleSelect = useCallback(
    (choice: string) => {
      if (selected || !kana) return;
      const correct = choice === romajiOf(kana);
      setSelected(choice);
      if (correct) rightRef.current += 1;
      speak(kana);

      const grade = gradeKanaCheck(kana, correct, progressRef.current);
      writesRef.current.push(answer(correct));
      for (const hit of grade.correct) {
        noteAnswer(hit, true);
        writesRef.current.push(record(hit, true));
      }
      for (const miss of grade.wrong) {
        noteAnswer(miss, false);
        writesRef.current.push(record(miss, false));
      }
    },
    [selected, kana, answer, record, speak, noteAnswer],
  );

  useEffect(() => {
    if (!selected) return;
    const timer = setTimeout(() => {
      setSelected(null);
      setIndex((i) => i + 1);
    }, ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [selected]);

  if (done) {
    const praise = pickPraise(rightRef.current / Math.max(1, questions.length), 0);
    const workOn = pickReviewQueue(byKana, {
      size: RESULT_WORK_ON,
      track: 'both',
      includeStrong: false,
    });
    return (
      <CelebrationScreen
        heading={praise.jp}
        headingEn={praise.en}
        subheading={t('solid', { count: rightRef.current })}
        extra={workOn.length > 0 ? t('workOn', { kana: workOn.join(' · ') }) : t('workOnNothing')}
        mode="kana-build"
        exitLabel={t('startReview')}
        onExit={onReview}
      />
    );
  }

  if (!kana) return null;

  return (
    <GameShell
      title={t('title')}
      emoji="⚡"
      howTo={t('howTo')}
      current={index}
      total={questions.length}
      onQuit={() => void endRun().then(onExit)}
    >
      <Box sx={{ width: '100%' }}>
        <Typography variant="body2" sx={{ textAlign: 'center', color: 'text.secondary', mb: 1 }}>
          {t('question')}
        </Typography>
        <KanaGlyph
          kana={kana}
          sx={{ mx: 'auto', mb: 2, bgcolor: alpha(theme.palette.brand[300], 0.12) }}
        />
        <ChoiceGrid
          choices={choices}
          correct={romajiOf(kana)}
          selected={selected}
          onSelect={handleSelect}
        />
      </Box>
    </GameShell>
  );
}
