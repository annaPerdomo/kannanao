'use client';
import { useTranslations } from 'next-intl';
import { useCallback, useRef, useState } from 'react';

import { GameShell } from '@/components/Games/GameShell';
import { CelebrationScreen, pickPraise } from '@/components/Practice/CelebrationScreen';
import { useGameSession } from '@/hooks/useGameSession';
import { getSet, isComboKana, isContextualKana } from '@/lib/kanaCurriculum';
import { drillChars, type KanaProgressMap } from '@/lib/kanaProficiency';

import { KANA_XP } from './constants';
import { focusDrillChars } from './kanaDrill';
import { LightningRound } from './LightningRound';
import { RecallDrill } from './RecallDrill';
import { RecognizeDrill } from './RecognizeDrill';
import { WordPairDrill } from './WordPairDrill';
import { pairsFor } from './wordPairs';

const STAGES = ['recognize', 'recall', 'wordPair', 'lightning'] as const;
const MIN_LIGHTNING_CHARS = 3;

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
    const isolated = list.filter((c) => !isContextualKana(c));
    const inWords = list.filter((c) => isContextualKana(c) || isComboKana(c));
    const hasPairs = pairsFor(inWords).length > 0;

    const stages = STAGES.filter((stage) => {
      if (stage === 'wordPair') return hasPairs;
      if (isolated.length === 0) return false;
      return stage !== 'lightning' || isolated.length >= MIN_LIGHTNING_CHARS;
    });
    return { chars: list, isolated, inWords, stages };
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

  if (session.chars.length === 0 || session.stages.length === 0) return null;

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
    chars: session.isolated,
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
      {stage === 'wordPair' && <WordPairDrill {...drillProps} chars={session.inWords} />}
      {stage === 'lightning' && <LightningRound {...drillProps} />}
    </GameShell>
  );
}
