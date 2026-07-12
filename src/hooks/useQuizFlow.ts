import { useCallback, useMemo, useState } from 'react';

import { buildQuizQuestions, QUIZ_DEFAULT_COUNT, type QuizQuestion } from '@/lib/quiz';
import type { Flashcard } from '@/types/flashcard';

export type QuizPhase = 'playing' | 'done';

export interface QuizFlow {
  /** The fixed question list, built once — never re-queued. */
  questions: QuizQuestion[];
  /** The question currently being asked, or undefined once finished. */
  current: QuizQuestion | undefined;
  /** Zero-based index of the current question. */
  index: number;
  total: number;
  score: number;
  phase: QuizPhase;
  /** Record the current question's result and advance. No retry, no re-queue. */
  answer: (correct: boolean) => void;
}

/**
 * Drives a single quiz: a fixed list of questions, each asked exactly once.
 * `answer()` only ever moves forward — there is no re-queue of wrong cards, which
 * is what makes the final score exam-like rather than practice-like. The question
 * list is memoized on `cards` so it stays stable across re-renders.
 */
export function useQuizFlow(cards: Flashcard[], count = QUIZ_DEFAULT_COUNT): QuizFlow {
  const questions = useMemo(() => buildQuizQuestions(cards, count), [cards, count]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);

  const answer = useCallback((correct: boolean) => {
    if (correct) setScore((s) => s + 1);
    setIndex((i) => i + 1);
  }, []);

  const phase: QuizPhase = index >= questions.length ? 'done' : 'playing';

  return {
    questions,
    current: questions[index],
    index,
    total: questions.length,
    score,
    phase,
    answer,
  };
}
