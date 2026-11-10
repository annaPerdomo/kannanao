import { type Dispatch, type SetStateAction, useCallback, useEffect, useState } from 'react';

import type { KanaReadingAnswer } from '@/lib/kanaGaps';
import type { JlptLevel } from '@/lib/lessonPrompts';
import { fetchGroupKanjiInUse } from '@/services/api';

import { defaultKanjiLevel, type LessonSetForm } from './constants';

function suggestedKanjiLevel(level: JlptLevel, kanjiInUse: boolean): KanaReadingAnswer {
  const fromLevel = defaultKanjiLevel(level);
  return kanjiInUse && fromLevel === 'not-yet' ? 'learning' : fromLevel;
}

export function useKanjiAnswer(
  groupId: string,
  setForm: Dispatch<SetStateAction<LessonSetForm>>,
): (patch: Partial<LessonSetForm>) => Partial<LessonSetForm> {
  const [answered, setAnswered] = useState(false);
  const [kanjiInUse, setKanjiInUse] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setKanjiInUse(false);
    if (!groupId) return;
    fetchGroupKanjiInUse(groupId)
      .then((inUse) => {
        if (!cancelled) setKanjiInUse(inUse);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [groupId]);

  useEffect(() => {
    if (answered) return;
    setForm((current) => {
      const kanjiLevel = suggestedKanjiLevel(current.level, kanjiInUse);
      return current.kanjiLevel === kanjiLevel ? current : { ...current, kanjiLevel };
    });
  }, [kanjiInUse, answered, setForm]);

  return useCallback(
    (patch) => {
      if (patch.kanjiLevel) {
        setAnswered(true);
        return patch;
      }
      return patch.level && !answered
        ? { ...patch, kanjiLevel: suggestedKanjiLevel(patch.level, kanjiInUse) }
        : patch;
    },
    [answered, kanjiInUse],
  );
}
