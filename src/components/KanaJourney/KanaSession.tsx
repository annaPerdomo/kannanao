'use client';
import { useTranslations } from 'next-intl';
import { useCallback, useRef, useState } from 'react';

import { GameShell } from '@/components/Games/GameShell';
import { CelebrationScreen, pickPraise } from '@/components/Practice/CelebrationScreen';
import { useGameSession } from '@/hooks/useGameSession';
import { getSet } from '@/lib/kanaCurriculum';
import { drillChars, type KanaProgressMap } from '@/lib/kanaProficiency';

import { focusDrillChars } from './kanaDrill';
import { LightningRound } from './LightningRound';
import { RecallDrill } from './RecallDrill';
import { RecognizeDrill } from './RecognizeDrill';

const STAGES = ['recognize', 'recall', 'lightning'] as const;
const MIN_LIGHTNING_CHARS = 3;

// Lightning grades ~2 answers a second: at the 40 XP card rate one replayed row
// would outrank a week of vocabulary study on the group leaderboard.
const KANA_XP = 8;

export interface KanaSessionRequest {
  /** Stamped on the session row and completes a kana assignment: never set on a mixed review. */
  setId?: string;
  kana?: string;
  chars?: string[];
}

interface KanaSessionProps extends KanaSessionRequest {
  byKana: KanaProgressMap;
  /** Writes one graded answer to kana_progress; never throws. */
  record: (kana: string, correct: boolean) => Promise<void>;
  onExit: () => void;
}

function sessionChars({ setId, kana, chars }: KanaSessionRequest, byKana: KanaProgressMap) {
  if (chars) return chars;
  if (kana) return focusDrillChars(kana);
  return setId ? drillChars(setId, byKana) : [];
}

export function KanaSession({ setId, kana, chars, byKana, record, onExit }: KanaSessionProps) {
  const t = useTranslations('KanaJourney.session');
  const { answer, finish, comboCount } = useGameSession('kana-journey', {
    correctXp: KANA_XP,
    kanaSet: setId ?? null,
  });

  // Snapshotted at mount: recomputing these as answers land would reshuffle the
  // question stream and the on-screen choices mid-question.
  const [session] = useState(() => {
    const list = sessionChars({ setId, kana, chars }, byKana);
    const stages =
      list.length >= MIN_LIGHTNING_CHARS ? STAGES : STAGES.filter((s) => s !== 'lightning');
    return { chars: list, stages };
  });

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
    if (stageIdx + 1 >= session.stages.length) {
      void endRun();
      return;
    }
    setStageIdx(stageIdx + 1);
  }, [stageIdx, session.stages.length, endRun]);

  const quit = useCallback(() => {
    void endRun().then(onExit);
  }, [endRun, onExit]);

  if (session.chars.length === 0) return null;

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

  const row = setId ? getSet(setId) : undefined;
  const title = row ? row.entries.map((e) => e.kana).join(' · ') : (kana ?? t('mixedTitle'));

  const stage = session.stages[stageIdx];
  const drillProps = {
    chars: session.chars,
    onAnswer: handleAnswer,
    onComplete: handleStageComplete,
  };

  return (
    <GameShell
      title={title}
      emoji={row?.label ?? kana ?? '🌸'}
      howTo={t(`${stage}HowTo`)}
      current={stageIdx}
      total={session.stages.length}
      comboCount={comboCount}
      onQuit={quit}
    >
      {stage === 'recognize' && <RecognizeDrill {...drillProps} />}
      {stage === 'recall' && <RecallDrill {...drillProps} />}
      {stage === 'lightning' && <LightningRound {...drillProps} />}
    </GameShell>
  );
}
