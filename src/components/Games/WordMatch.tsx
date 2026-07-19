'use client';

import CheckIcon from '@mui/icons-material/Check';
import { Alert, alpha, Box, Grid, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Loading } from '@/components/Loading';
import { CelebrationScreen } from '@/components/Practice/CelebrationScreen';
import { SpeakButton } from '@/components/SpeakButton';
import { useGameSession } from '@/hooks/useGameSession';
import { useReviewCards } from '@/hooks/useReviewCards';
import { chunkRounds, shuffle } from '@/lib/reviewGames';
import type { JlptLevel } from '@/types/flashcard';

import { GameShell } from './GameShell';
import { type MatchWord, pickMatchWords } from './gameWords';

const PAIRS_PER_ROUND = 6;

interface Tile {
  id: string;
  jp: string;
  side: 'jp' | 'en';
  label: string;
  speak?: string;
}

/** How a resolved (correct) or attempted (wrong) pair is reported upward. */
export type MatchGradeFn = (correct: boolean, word: MatchWord | undefined) => void;

interface MatchGridProps {
  words: MatchWord[];
  comboCount: number;
  onGrade: MatchGradeFn;
  onComplete: (stats: { correct: number; total: number }) => void;
  onQuit: () => void | Promise<void>;
  questMap?: React.ReactNode;
}

/**
 * The tile-matching board itself — no session ownership. Both the standalone
 * game and the embedded quest node render this; they differ only in how they
 * grade answers and what happens on completion.
 */
function MatchGrid({ words, comboCount, onGrade, onComplete, onQuit, questMap }: MatchGridProps) {
  const theme = useTheme();
  const { brand, surfaces } = theme.palette;
  const t = useTranslations('Games.wordMatch');

  const rounds = useMemo(() => chunkRounds(words, PAIRS_PER_ROUND), [words]);
  const [roundIdx, setRoundIdx] = useState(0);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Tile | null>(null);
  const [wrongId, setWrongId] = useState<string | null>(null);
  const correctRef = useRef(0);
  const answeredRef = useRef(0);
  const byJp = useMemo(() => new Map(words.map((w) => [w.jp, w])), [words]);

  // An embedded quest node can be fed an empty word list (e.g. every due card
  // lacked a display text or meaning) — hand back immediately instead of
  // crashing on rounds[0] below.
  useEffect(() => {
    if (words.length === 0) onComplete({ correct: 0, total: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words.length]);

  const round = rounds[roundIdx] ?? [];
  const tiles = useMemo<Tile[]>(
    () =>
      shuffle(
        (rounds[roundIdx] ?? []).flatMap((w): Tile[] => [
          { id: `jp-${w.jp}`, jp: w.jp, side: 'jp', label: w.jp, speak: w.speak },
          {
            id: `en-${w.jp}`,
            jp: w.jp,
            side: 'en',
            label: w.emoji ? `${w.emoji} ${w.english}` : w.english,
          },
        ]),
      ),
    [rounds, roundIdx],
  );

  const handleSelect = (tile: Tile) => {
    if (matched.has(tile.jp) || wrongId) return;
    if (selected?.id === tile.id) {
      setSelected(null);
      return;
    }
    if (!selected) {
      setSelected(tile);
      return;
    }
    // Tapping another tile on the SAME side switches the selection — it's a
    // re-pick, not an answer, so it must never be graded (or penalize the SRS).
    if (selected.side === tile.side) {
      setSelected(tile);
      return;
    }

    answeredRef.current += 1;
    if (selected.jp === tile.jp) {
      correctRef.current += 1;
      // The pair IS one card — grade it once, correct, so it advances the SRS.
      onGrade(true, byJp.get(tile.jp));
      const next = new Set([...matched, tile.jp]);
      setMatched(next);
      setSelected(null);
      if (next.size === round.length) {
        setTimeout(() => {
          setMatched(new Set());
          if (roundIdx + 1 >= rounds.length) {
            onComplete({ correct: correctRef.current, total: answeredRef.current });
          } else {
            setRoundIdx(roundIdx + 1);
          }
        }, 800);
      }
    } else {
      // A wrong attempt is blamed on the clicked card (same convention as the
      // deck-practice MatchMode) so a word the player struggles with comes back
      // SOONER — dropping the cardId here meant games could only ever push a
      // card's schedule forward, never reset it.
      onGrade(false, byJp.get(tile.jp));
      setWrongId(tile.id);
      setTimeout(() => {
        setWrongId(null);
        setSelected(null);
      }, 600);
    }
  };

  if (words.length === 0) return null;

  return (
    <GameShell
      title={t('title')}
      emoji="🍉"
      howTo={t('howTo')}
      current={roundIdx}
      total={rounds.length}
      comboCount={comboCount}
      onQuit={onQuit}
      questMap={questMap}
    >
      <Grid container spacing={1.5}>
        {tiles.map((tile) => {
          const isMatched = matched.has(tile.jp);
          const isSelected = selected?.id === tile.id;
          const isWrong = wrongId === tile.id || (!!wrongId && isSelected);
          return (
            <Grid size={{ xs: 6, sm: 4 }} key={tile.id}>
              <Box
                role="button"
                tabIndex={isMatched ? -1 : 0}
                aria-disabled={isMatched || undefined}
                onClick={() => handleSelect(tile)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSelect(tile);
                  }
                }}
                sx={{
                  p: 1.5,
                  minHeight: 68,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 3,
                  border: '2px solid',
                  textAlign: 'center',
                  cursor: isMatched ? 'default' : 'pointer',
                  transition: 'all 0.15s',
                  borderColor: isMatched
                    ? 'success.main'
                    : isWrong
                      ? 'error.main'
                      : isSelected
                        ? 'primary.main'
                        : alpha(brand[200], 0.7),
                  bgcolor: isMatched
                    ? alpha(theme.palette.success.main, 0.1)
                    : isWrong
                      ? alpha(theme.palette.error.main, 0.08)
                      : isSelected
                        ? alpha(brand[300], 0.16)
                        : surfaces.input,
                  opacity: isMatched ? 0.75 : 1,
                  transform: isSelected ? 'scale(1.04)' : 'scale(1)',
                  '&:hover': !isMatched
                    ? { borderColor: brand[500], bgcolor: alpha(brand[300], 0.2) }
                    : {},
                }}
              >
                {isMatched ? (
                  <CheckIcon sx={{ fontSize: '1.2rem', color: 'success.main' }} />
                ) : tile.side === 'jp' ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography sx={{ fontFamily: (t) => t.fonts.jp, fontSize: '1.05rem' }}>
                      {tile.label}
                    </Typography>
                    {tile.speak && <SpeakButton text={tile.speak} iconSize="0.9rem" />}
                  </Box>
                ) : (
                  <Typography sx={{ fontSize: '0.85rem' }}>{tile.label}</Typography>
                )}
              </Box>
            </Grid>
          );
        })}
      </Grid>
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
  const t = useTranslations('Games.wordMatch');
  const { dueCards, allCards, loading, error } = useReviewCards();
  // Pick the session's words once per load — due cards first, topped up at random.
  const words = useMemo(
    () => (loading ? [] : pickMatchWords(dueCards, allCards)),
    [dueCards, allCards, loading],
  );

  if (loading) return <Loading />;
  if (error) {
    return (
      <Alert severity="error" sx={{ m: 3 }}>
        {t('loadError', { error })}
      </Alert>
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
