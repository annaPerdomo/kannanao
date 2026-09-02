'use client';

import { Box } from '@mui/material';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { DataErrorState } from '@/components/DataErrorState';
import { Loading } from '@/components/Loading';
import { type MatchPair, type MatchRoundProgress, PairBoard } from '@/components/MatchPairs';
import { CelebrationScreen } from '@/components/Practice/CelebrationScreen';
import { useGameSession } from '@/hooks/useGameSession';
import { useReviewCards } from '@/hooks/useReviewCards';
import type { JlptLevel } from '@/types/flashcard';

import { GameShell } from './GameShell';
import { type MatchWord, pickMatchWords } from './gameWords';

interface WordMatchPair extends MatchPair {
  word: MatchWord;
}

/** How a resolved (correct) or attempted (wrong) pair is reported upward. */
export type MatchGradeFn = (correct: boolean, word: MatchWord | undefined) => void;

function toPairs(words: MatchWord[]): WordMatchPair[] {
  return words.map((word) => ({
    key: word.jp,
    left: word.jp,
    right: word.emoji ? `${word.emoji} ${word.english}` : word.english,
    leftSpeak: word.speak,
    word,
  }));
}

interface MatchGridProps {
  words: MatchWord[];
  comboCount: number;
  onGrade: MatchGradeFn;
  onComplete: (stats: { correct: number; total: number }) => void;
  onQuit: () => void | Promise<void>;
  questMap?: React.ReactNode;
}

function MatchGrid({ words, comboCount, onGrade, onComplete, onQuit, questMap }: MatchGridProps) {
  const t = useTranslations('Games.wordMatch');
  const pairs = useMemo(() => toPairs(words), [words]);
  const [progress, setProgress] = useState<MatchRoundProgress>({ index: 0, total: 1 });

  const handleGrade = useCallback(
    (correct: boolean, pair: WordMatchPair | undefined) => onGrade(correct, pair?.word),
    [onGrade],
  );

  // No words: hand back rather than open a GameShell with nothing in it.
  useEffect(() => {
    if (words.length === 0) onComplete({ correct: 0, total: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words.length]);

  if (words.length === 0) return null;

  return (
    <GameShell
      title={t('title')}
      emoji="🍉"
      howTo={t('howTo')}
      current={progress.index}
      total={progress.total}
      comboCount={comboCount}
      onQuit={onQuit}
      questMap={questMap}
    >
      <PairBoard<WordMatchPair>
        pairs={pairs}
        onGrade={handleGrade}
        onComplete={onComplete}
        onProgress={setProgress}
      />
    </GameShell>
  );
}

/** Standalone Word Match board — owns its own deckless session. */
function MatchBoard({ words, onExit }: { words: MatchWord[]; onExit: () => void }) {
  const t = useTranslations('Games.wordMatch');
  const { answer, finish, comboCount } = useGameSession('word-match');
  const [done, setDone] = useState(false);
  const statsRef = useRef({ correct: 0, total: 0 });

  const handleGrade = useCallback<MatchGradeFn>(
    (correct, word) => {
      void answer(correct, word?.jlpt, word?.cardId);
    },
    [answer],
  );

  const handleComplete = useCallback(
    (stats: { correct: number; total: number }) => {
      statsRef.current = stats;
      setDone(true);
      void finish();
    },
    [finish],
  );

  if (done) {
    const { correct, total } = statsRef.current;
    return (
      <CelebrationScreen
        heading={t('celebrationHeading')}
        subheading={t('celebrationSubheading', { count: words.length })}
        extra={t('celebrationExtra', { matches: correct, misses: total - correct })}
        mode="word-match"
        onExit={onExit}
      />
    );
  }

  return (
    <MatchGrid
      words={words}
      comboCount={comboCount}
      onGrade={handleGrade}
      onComplete={handleComplete}
      onQuit={async () => {
        await finish();
        onExit();
      }}
    />
  );
}

export function WordMatch() {
  const router = useRouter();
  const { dueCards, allCards, loading, error, retry } = useReviewCards();
  // Pick the session's words once per load — due cards first, topped up at random.
  const words = useMemo(
    () => (loading ? [] : pickMatchWords(dueCards, allCards)),
    [dueCards, allCards, loading],
  );

  if (loading) return <Loading />;
  if (error) {
    return (
      <Box sx={{ m: 3 }}>
        <DataErrorState error={error} onRetry={retry} />
      </Box>
    );
  }
  return <MatchBoard words={words} onExit={() => router.push('/review')} />;
}

interface WordMatchEmbeddedProps {
  /** The quest's Word Match cards (the last 6 due cards). */
  words: MatchWord[];
  comboCount: number;
  /** Grade one resolved/attempted pair into the quest's shared session. */
  onPairResolved: (
    correct: boolean,
    cardId: string | undefined,
    jlpt: JlptLevel | undefined,
  ) => void;
  onComplete: () => void;
  onQuit: () => void;
  questMap?: React.ReactNode;
}

/**
 * Word Match embedded in the review quest: no session of its own — it grades
 * through the quest's shared 'review' session via `onPairResolved`, and hands
 * back with `onComplete` when every pair is matched (no celebration; the quest
 * runs one at the very end).
 */
export function WordMatchEmbedded({
  words,
  comboCount,
  onPairResolved,
  onComplete,
  onQuit,
  questMap,
}: WordMatchEmbeddedProps) {
  const handleGrade = useCallback<MatchGradeFn>(
    (correct, word) => {
      onPairResolved(correct, word?.cardId, word?.jlpt);
    },
    [onPairResolved],
  );

  return (
    <MatchGrid
      words={words}
      comboCount={comboCount}
      onGrade={handleGrade}
      onComplete={() => onComplete()}
      onQuit={onQuit}
      questMap={questMap}
    />
  );
}
