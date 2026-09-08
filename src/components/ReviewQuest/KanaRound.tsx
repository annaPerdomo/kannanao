'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';

import { GameShell } from '@/components/Games/GameShell';
import { RecallDrill, RecognizeDrill } from '@/components/KanaJourney';

import { KanaMeetCard } from './KanaMeetCard';

const STAGES = ['recognize', 'recall'] as const;

export interface KanaRoundProps {
  chars: string[];
  /** Those of `chars` the learner has never been shown — they get a meet card first. */
  newChars?: string[];
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
  newChars,
  comboCount,
  onAnswer,
  onComplete,
  onQuit,
  questMap,
}: KanaRoundProps) {
  const t = useTranslations('Review.reviewQuest');
  const tHowTo = useTranslations('KanaJourney.session');
  const meet = useMemo(
    () => (newChars ?? []).filter((kana) => chars.includes(kana)),
    [newChars, chars],
  );
  const [meetIdx, setMeetIdx] = useState(0);
  const [stageIdx, setStageIdx] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [missed, setMissed] = useState<string[]>([]);
  const [retrying, setRetrying] = useState<string[] | null>(null);

  const handleAnswer = useCallback(
    (kana: string | string[], correct: boolean) => {
      setAnswered((n) => n + 1);
      const asked = Array.isArray(kana) ? kana : [kana];
      for (const one of asked) onAnswer(one, correct);
      // One retry per character per stage: a bad day must not loop the node.
      if (!correct && !retrying) setMissed((m) => [...m, ...asked.filter((k) => !m.includes(k))]);
    },
    [onAnswer, retrying],
  );

  const nextStage = useCallback(() => {
    if (missed.length > 0 && !retrying) {
      setRetrying(missed);
      setMissed([]);
      return;
    }
    setRetrying(null);
    setMissed([]);
    if (stageIdx + 1 >= STAGES.length) {
      onComplete();
      return;
    }
    setStageIdx(stageIdx + 1);
  }, [missed, retrying, stageIdx, onComplete]);

  if (chars.length === 0) return null;

  const total = chars.length * STAGES.length + (retrying?.length ?? 0);
  const stage = STAGES[stageIdx];
  const meetKana = meetIdx < meet.length ? meet[meetIdx] : null;
  const drillChars = retrying ?? chars;
  const drillProps = {
    chars: drillChars,
    // Only the one-character retry needs a pool: narrowing the main stages to
    // the node's own characters lets a learner answer the last one by elimination.
    decoyPool: retrying ? chars : undefined,
    onAnswer: handleAnswer,
    onComplete: nextStage,
  };

  return (
    <GameShell
      title={t('kanaRoundTitle')}
      emoji="あ"
      howTo={meetKana ? t('meetHowTo') : tHowTo(`${stage}HowTo`)}
      current={Math.min(answered, total)}
      total={total}
      comboCount={comboCount}
      onQuit={onQuit}
      questMap={questMap}
    >
      {meetKana ? (
        <KanaMeetCard kana={meetKana} onNext={() => setMeetIdx((i) => i + 1)} />
      ) : stage === 'recognize' ? (
        <RecognizeDrill key={retrying ? 'retry' : 'main'} {...drillProps} />
      ) : (
        <RecallDrill key={retrying ? 'retry' : 'main'} {...drillProps} />
      )}
    </GameShell>
  );
}
