'use client';

import { useMemo, useRef } from 'react';

import { isUnseen, type KanaProgressMap, readingStage } from '@/lib/kanaProficiency';
import { gradeQuestKana } from '@/lib/quest';

export interface QuestKana {
  /** Those of `chars` the learner had never been shown when the node opened. */
  newChars: string[];
  brushUpCount: number;
  /** One answer plus the row-mates it credits — call per graded answer. */
  grade: (kana: string, correct: boolean) => { correct: string[]; wrong: string[] };
  /** True once this session's answers finish the base hiragana rows. */
  readsHiraganaNow: () => boolean;
}

export function useQuestKana(
  chars: string[],
  byKana: KanaProgressMap | null | undefined,
): QuestKana {
  // Frozen at mount: which characters are first meetings must not shift as the
  // node's own optimistic writes land.
  const startRef = useRef<KanaProgressMap>(byKana ?? new Map());
  // A quest can open before the chart read lands, leaving the snapshot empty
  // and every character looking new — that guess must not reach the learner.
  const startKnownRef = useRef(byKana != null);
  const liveRef = useRef<KanaProgressMap>(byKana ?? startRef.current);
  liveRef.current = byKana ?? startRef.current;

  const newChars = useMemo(
    () =>
      startKnownRef.current ? chars.filter((kana) => isUnseen(startRef.current.get(kana))) : [],
    [chars],
  );

  return {
    newChars,
    brushUpCount: chars.length - newChars.length,
    // Credit reads the LIVE map: against the frozen one a row-mate stays unseen
    // all node and every later hit credits it again, up to unearned mastery.
    grade: (kana, correct) => gradeQuestKana(kana, correct, liveRef.current),
    readsHiraganaNow: () =>
      startKnownRef.current &&
      chars.length > 0 &&
      readingStage(startRef.current, 'hiragana') !== 'reads' &&
      readingStage(liveRef.current, 'hiragana') === 'reads',
  };
}
