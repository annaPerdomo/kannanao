'use client';

import CheckIcon from '@mui/icons-material/Check';
import { Alert, alpha, Box, Grid, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';

import { Loading } from '@/components/Loading';
import { CelebrationScreen } from '@/components/Practice/CelebrationScreen';
import { SpeakButton } from '@/components/SpeakButton';
import { useAllCards } from '@/hooks/useAllCards';
import { useGameSession } from '@/hooks/useGameSession';
import { chunkRounds, shuffle } from '@/lib/reviewGames';

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

function MatchBoard({ words, onExit }: { words: MatchWord[]; onExit: () => void }) {
  const theme = useTheme();
  const { brand, surfaces } = theme.palette;
  const { answer, finish } = useGameSession('word-match');

  const rounds = useMemo(() => chunkRounds(words, PAIRS_PER_ROUND), [words]);
  const [roundIdx, setRoundIdx] = useState(0);
  const [done, setDone] = useState(false);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Tile | null>(null);
  const [wrongId, setWrongId] = useState<string | null>(null);
  const correctRef = useRef(0);
  const answeredRef = useRef(0);
  const byJp = useMemo(() => new Map(words.map((w) => [w.jp, w])), [words]);

  const round = rounds[roundIdx];
  const tiles = useMemo<Tile[]>(
    () =>
      shuffle(
        rounds[roundIdx].flatMap((w): Tile[] => [
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

    answeredRef.current += 1;
    if (selected.jp === tile.jp && selected.side !== tile.side) {
      correctRef.current += 1;
      void answer(true, byJp.get(tile.jp)?.jlpt);
      const next = new Set([...matched, tile.jp]);
      setMatched(next);
      setSelected(null);
      if (next.size === round.length) {
        setTimeout(() => {
          setMatched(new Set());
          if (roundIdx + 1 >= rounds.length) {
            setDone(true);
            finish();
          } else {
            setRoundIdx(roundIdx + 1);
          }
        }, 800);
      }
    } else {
      void answer(false, byJp.get(tile.jp)?.jlpt);
      setWrongId(tile.id);
      setTimeout(() => {
        setWrongId(null);
        setSelected(null);
      }, 600);
    }
  };

  if (done) {
    return (
      <CelebrationScreen
        heading="All matched!"
        subheading={`${words.length} words · ${rounds.length} rounds`}
        extra={`${correctRef.current} matches · ${answeredRef.current - correctRef.current} misses`}
        mode="word-match"
        onExit={onExit}
      />
    );
  }

  return (
    <GameShell
      title="Word Match"
      emoji="🍉"
      current={roundIdx}
      total={rounds.length}
      onQuit={async () => {
        await finish();
        onExit();
      }}
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
                    <Typography sx={{ fontFamily: '"Noto Serif JP", serif', fontSize: '1.05rem' }}>
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

export function WordMatch() {
  const router = useRouter();
  const { cards, loading, error } = useAllCards();
  // Pick the session's words once per load — a fresh random mix each visit
  const words = useMemo(() => (loading ? [] : pickMatchWords(cards)), [cards, loading]);

  if (loading) return <Loading />;
  if (error) {
    return (
      <Alert severity="error" sx={{ m: 3 }}>
        Couldn’t load your cards: {error}
      </Alert>
    );
  }
  return <MatchBoard words={words} onExit={() => router.push('/games')} />;
}
