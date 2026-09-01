'use client';
import { useTranslations } from 'next-intl';
import { useCallback, useRef, useState } from 'react';

import { GameShell } from '@/components/Games/GameShell';
import { CelebrationScreen, pickPraise } from '@/components/Practice/CelebrationScreen';
import { useGameSession } from '@/hooks/useGameSession';
import { getSet } from '@/lib/kanaCurriculum';
import { drillChars, type KanaProgressMap, unlockedKana } from '@/lib/kanaProficiency';

import { LightningRound } from './LightningRound';
import { RecallDrill } from './RecallDrill';
import { RecognizeDrill } from './RecognizeDrill';

const STAGES = ['recognize', 'recall', 'lightning'] as const;

// Lightning grades ~2 answers a second: at the 40 XP card rate one replayed row
// would outrank a week of vocabulary study on the group leaderboard.
const KANA_XP = 8;

interface IslandSessionProps {
  setId: string;
  byKana: KanaProgressMap;
  /** Writes one graded answer to kana_progress; never throws. */
  record: (kana: string, correct: boolean) => Promise<void>;
  onExit: () => void;
}

export function IslandSession({ setId, byKana, record, onExit }: IslandSessionProps) {
  const t = useTranslations('KanaJourney.session');
  // setId is stamped on the session row, which is what lets it complete a kana
  // assignment. A mixed kana review must never pass one.
  const { answer, finish, comboCount } = useGameSession('kana-journey', {
    correctXp: KANA_XP,
    kanaSet: setId,
  });

  const set = getSet(setId);
  // Snapshotted at mount: recomputing these as answers land would reshuffle the
  // question stream and the on-screen choices mid-question.
  const [{ chars, unlocked }] = useState(() => ({
    chars: drillChars(setId, byKana),
    unlocked: set ? unlockedKana(set.track, byKana) : [],
  }));

  const [stageIdx, setStageIdx] = useState(0);
  const [done, setDone] = useState(false);
  const answeredRef = useRef(0);
  const correctRef = useRef(0);
  const writesRef = useRef<Promise<unknown>[]>([]);
  const finishedRef = useRef(false);

  const handleAnswer = useCallback(
    (kana: string, correct: boolean) => {
      answeredRef.current += 1;
      if (correct) correctRef.current += 1;
      writesRef.current.push(answer(correct));
      writesRef.current.push(record(kana, correct));
    },
    [answer, record],
  );

  const endRun = useCallback(async () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    // endSession re-reads progress from the DB, so every per-answer write has to
    // have landed first or the session's XP total is read back stale.
    await Promise.allSettled(writesRef.current);
    await finish();
    setDone(true);
  }, [finish]);

  const handleStageComplete = useCallback(() => {
    if (stageIdx + 1 >= STAGES.length) {
      void endRun();
      return;
    }
    setStageIdx(stageIdx + 1);
  }, [stageIdx, endRun]);

  const quit = useCallback(() => {
    void endRun().then(onExit);
  }, [endRun, onExit]);

  if (!set) return null;

  if (done) {
    const pct = answeredRef.current > 0 ? correctRef.current / answeredRef.current : 1;
    const praise = pickPraise(pct, 0);
    return (
      <CelebrationScreen
        heading={praise.jp}
        headingEn={praise.en}
        subheading={t('celebrationSubheading', {
          correct: correctRef.current,
          total: answeredRef.current,
        })}
        mode="kana-build"
        exitLabel={t('backToJourney')}
        onExit={onExit}
      />
    );
  }

  const stage = STAGES[stageIdx];
  const drillProps = {
    setId,
    chars,
    unlocked,
    onAnswer: handleAnswer,
    onComplete: handleStageComplete,
  };

  return (
    <GameShell
      title={set.entries.map((e) => e.kana).join(' · ')}
      emoji={set.label}
      howTo={t(`${stage}HowTo`)}
      current={stageIdx}
      total={STAGES.length}
      comboCount={comboCount}
      onQuit={quit}
    >
      {stage === 'recognize' && <RecognizeDrill {...drillProps} />}
      {stage === 'recall' && <RecallDrill {...drillProps} />}
      {stage === 'lightning' && <LightningRound {...drillProps} />}
    </GameShell>
  );
}
