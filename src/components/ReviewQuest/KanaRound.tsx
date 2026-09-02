'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';

import { GameShell } from '@/components/Games/GameShell';
import { RecallDrill, RecognizeDrill } from '@/components/KanaJourney';

const STAGES = ['recognize', 'recall'] as const;

export interface KanaRoundProps {
  chars: string[];
  comboCount: number;
  /** Grades one answer into the quest's session AND kana_progress. */
  onAnswer: (kana: string, correct: boolean) => void;
  onComplete: () => void;
  onQuit: () => void;
  questMap: React.ReactNode;
}

/** The drills and the grading are both borrowed, so this owns no session. */
export function KanaRound({
  chars,
  comboCount,
  onAnswer,
  onComplete,
  onQuit,
  questMap,
}: KanaRoundProps) {
  const t = useTranslations('Review.reviewQuest');
  const tHowTo = useTranslations('KanaJourney.session');
  const [stageIdx, setStageIdx] = useState(0);
  const [answered, setAnswered] = useState(0);

  const handleAnswer = useCallback(
    (kana: string | string[], correct: boolean) => {
      setAnswered((n) => n + 1);
      for (const one of Array.isArray(kana) ? kana : [kana]) onAnswer(one, correct);
    },
    [onAnswer],
  );

  const nextStage = useCallback(() => {
    if (stageIdx + 1 >= STAGES.length) {
      onComplete();
      return;
    }
    setStageIdx(stageIdx + 1);
  }, [stageIdx, onComplete]);

  if (chars.length === 0) return null;

  const stage = STAGES[stageIdx];
  const drillProps = { chars, onAnswer: handleAnswer, onComplete: nextStage };

  return (
    <GameShell
      title={t('kanaRoundTitle')}
      emoji="あ"
      howTo={tHowTo(`${stage}HowTo`)}
      current={answered}
      total={chars.length * STAGES.length}
      comboCount={comboCount}
      onQuit={onQuit}
      questMap={questMap}
    >
      {stage === 'recognize' ? <RecognizeDrill {...drillProps} /> : <RecallDrill {...drillProps} />}
    </GameShell>
  );
}
