import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { stripFurigana } from '@/components/FuriganaText';
import { useAuth } from '@/contexts/AuthContext';
import { useXpAnimation } from '@/contexts/XpAnimationContext';
import { useCombo } from '@/hooks/useCombo';
import { usePracticeSentences } from '@/hooks/usePracticeSentences';
import { useProgress } from '@/hooks/useProgress';
import type { Flashcard } from '@/types/flashcard';
import type { PracticeSentence } from '@/types/practiceSentence';

import { MIN_SENTENCES, XP_CORRECT, XP_PERFECT_BONUS, XP_WRONG } from './constants';

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildOptions(sentence: PracticeSentence): string[] {
  const all = [sentence.targetParticle, ...sentence.distractors];
  return shuffleArray([...new Set(all)]);
}

interface UseKotobaGameArgs {
  cards: Flashcard[];
  deckId: string;
  batchSize: number;
}

export function useKotobaGame({ cards, deckId, batchSize }: UseKotobaGameArgs) {
  const { isMemberAccount, user } = useAuth();

  // A learner's id is passed only so a legacy personalised set still renders;
  // the server falls back to the shared set, which is all that is written now.
  const { sentences, loading, generating, error, hasContent, generate } = usePracticeSentences(
    deckId,
    isMemberAccount ? (user?.id ?? undefined) : undefined,
  );

  const showFurigana = useMemo(() => cards[0]?.mainViewMode !== 'kanji', [cards]);

  const deckWords = useMemo(
    () => cards.flatMap((c) => [c.word, c.reading].filter(Boolean)),
    [cards],
  );

  const gameSentences = useMemo(() => {
    if (!hasContent) return [];
    const withDeckWords = sentences.filter((s) => {
      const plain = stripFurigana(s.sentenceJp);
      return deckWords.some((w) => w && plain.includes(w));
    });
    const pool = withDeckWords.length >= MIN_SENTENCES ? withDeckWords : sentences;
    const shuffled = shuffleArray(pool);
    return shuffled.slice(0, Math.min(batchSize, shuffled.length));
  }, [sentences, hasContent, batchSize, deckWords]);

  const [index, setIndex] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [gameComplete, setGameComplete] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [xpPop, setXpPop] = useState<{ amount: number; correct: boolean; key: number } | null>(
    null,
  );
  const [results, setResults] = useState<{ sentence: PracticeSentence; correct: boolean }[]>([]);

  const { startSession, recordAnswer, endSession, addBonusXp } = useProgress();
  const combo = useCombo(addBonusXp);
  const praiseSeed = useMemo(() => Math.floor(Math.random() * 1000), []);
  const { triggerXpEarned } = useXpAnimation();
  const sessionIdRef = useRef<string>('');
  const sessionEndedRef = useRef(false);
  const startTimeRef = useRef(Date.now());
  // Mirrors live state so the unmount cleanup's stable `[endSession]` dep
  // array doesn't close over a stale render.
  const resultsCountRef = useRef(0);
  const totalCorrectRef = useRef(0);
  // Guards against a second concurrent startSession call between the start
  // effect firing and its promise resolving (sessionIdRef is still empty then).
  const sessionStartedRef = useRef(false);

  useEffect(() => {
    if (sessionStartedRef.current) return;
    if (gameSentences.length >= MIN_SENTENCES) {
      sessionStartedRef.current = true;
      sessionEndedRef.current = false;
      startSession(deckId, 'kotoba-bubble').then((id) => {
        sessionIdRef.current = id;
        startTimeRef.current = Date.now();
      });
    }
  }, [deckId, startSession, gameSentences.length]);

  useEffect(() => {
    return () => {
      if (sessionIdRef.current && !sessionEndedRef.current) {
        endSession(sessionIdRef.current, {
          cardsStudied: resultsCountRef.current,
          cardsCorrect: totalCorrectRef.current,
          durationSecs: Math.round((Date.now() - startTimeRef.current) / 1000),
        });
      }
    };
  }, [endSession]);

  const currentSentence = gameSentences[index];
  useEffect(() => {
    if (currentSentence) {
      setOptions(buildOptions(currentSentence));
      setSelected(null);
      setIsCorrect(null);
    }
  }, [currentSentence]);

  const finishGame = useCallback(async () => {
    if (sessionIdRef.current && !sessionEndedRef.current) {
      sessionEndedRef.current = true;
      sessionStartedRef.current = false;
      await endSession(sessionIdRef.current, {
        cardsStudied: gameSentences.length,
        cardsCorrect: totalCorrect,
        durationSecs: Math.round((Date.now() - startTimeRef.current) / 1000),
      });
    }
    setGameComplete(true);
  }, [gameSentences.length, totalCorrect, endSession]);

  const handleSelect = useCallback(
    async (particle: string) => {
      if (selected || !currentSentence) return;
      setSelected(particle);

      const correct = particle === currentSentence.targetParticle;
      setIsCorrect(correct);

      const xpAmount = correct ? XP_CORRECT : XP_WRONG;
      setXpPop({ amount: xpAmount, correct, key: Date.now() });
      setTimeout(() => setXpPop(null), 1300);
      triggerXpEarned(xpAmount);

      if (correct) {
        setTotalCorrect((c) => c + 1);
        totalCorrectRef.current += 1;
      }

      setResults((prev) => [...prev, { sentence: currentSentence, correct }]);
      resultsCountRef.current += 1;

      if (sessionIdRef.current) {
        // Sentence-based mode — no single card to attribute, so no cardId.
        await recordAnswer(sessionIdRef.current, correct);
      }
      const res = combo.onAnswer(correct);
      setBestStreak((b) => Math.max(b, res.count));
    },
    [selected, currentSentence, recordAnswer, triggerXpEarned, combo],
  );

  const handleNext = useCallback(() => {
    if (index + 1 >= gameSentences.length) {
      finishGame();
      return;
    }
    setIndex((i) => i + 1);
  }, [index, gameSentences.length, finishGame]);

  const handleRestart = useCallback(async () => {
    if (sessionIdRef.current && !sessionEndedRef.current) {
      sessionEndedRef.current = true;
      await endSession(sessionIdRef.current, {
        cardsStudied: results.length,
        cardsCorrect: totalCorrect,
        durationSecs: Math.round((Date.now() - startTimeRef.current) / 1000),
      });
    }
    setIndex(0);
    combo.reset();
    setBestStreak(0);
    setTotalCorrect(0);
    setSelected(null);
    setIsCorrect(null);
    setGameComplete(false);
    setShowSummary(false);
    setResults([]);
    resultsCountRef.current = 0;
    totalCorrectRef.current = 0;
    sessionEndedRef.current = false;
    sessionStartedRef.current = true;
    startSession(deckId, 'kotoba-bubble').then((id) => {
      sessionIdRef.current = id;
      startTimeRef.current = Date.now();
    });
  }, [deckId, results.length, totalCorrect, startSession, endSession, combo]);

  const perfectBonusTriggeredRef = useRef(false);
  useEffect(() => {
    if (gameComplete && !perfectBonusTriggeredRef.current) {
      const pct = totalCorrect / gameSentences.length;
      if (pct === 1) {
        addBonusXp(XP_PERFECT_BONUS);
        triggerXpEarned(XP_PERFECT_BONUS);
      }
      perfectBonusTriggeredRef.current = true;
    }
    if (!gameComplete) {
      perfectBonusTriggeredRef.current = false;
    }
  }, [gameComplete, totalCorrect, gameSentences.length, addBonusXp, triggerXpEarned]);

  return {
    sentences,
    loading,
    generating,
    error,
    hasContent,
    generate,
    showFurigana,
    deckWords,
    gameSentences,
    currentSentence,
    options,
    selected,
    isCorrect,
    index,
    combo,
    bestStreak,
    totalCorrect,
    results,
    gameComplete,
    showSummary,
    setShowSummary,
    xpPop,
    praiseSeed,
    handleSelect,
    handleNext,
    handleRestart,
  };
}

export type KotobaGame = ReturnType<typeof useKotobaGame>;
