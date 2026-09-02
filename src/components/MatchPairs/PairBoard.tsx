'use client';

import CheckIcon from '@mui/icons-material/Check';
import { alpha, Box, Grid, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useEffect, useMemo, useRef, useState } from 'react';

import { SpeakButton } from '@/components/SpeakButton';
import { chunkRounds, shuffle } from '@/lib/reviewGames';

import type { MatchBoardVariant, MatchPair, MatchPairGradeFn, MatchRoundProgress } from './types';

export const PAIRS_PER_ROUND = 6;

interface Tile {
  id: string;
  pairKey: string;
  side: 'left' | 'right';
  label: string;
  speak?: string;
  japanese: boolean;
}

function japaneseFontSize(label: string) {
  const glyphs = [...label].length;
  if (glyphs <= 2) return { xs: '2rem', sm: '2.4rem' };
  if (glyphs <= 4) return { xs: '1.4rem', sm: '1.7rem' };
  return { xs: '1.05rem', sm: '1.2rem' };
}

interface PairBoardProps<P extends MatchPair> {
  pairs: P[];
  variant?: MatchBoardVariant;
  onGrade: MatchPairGradeFn<P>;
  onComplete: (stats: { correct: number; total: number }) => void;
  onProgress?: (progress: MatchRoundProgress) => void;
  pairsPerRound?: number;
}

/** The tile-matching board itself: no session of its own, and no XP — the caller grades. */
export function PairBoard<P extends MatchPair>({
  pairs,
  variant = 'meaning',
  onGrade,
  onComplete,
  onProgress,
  pairsPerRound = PAIRS_PER_ROUND,
}: PairBoardProps<P>) {
  const theme = useTheme();
  const { brand, surfaces } = theme.palette;

  const rounds = useMemo(() => chunkRounds(pairs, pairsPerRound), [pairs, pairsPerRound]);
  const [roundIdx, setRoundIdx] = useState(0);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Tile | null>(null);
  const [wrongId, setWrongId] = useState<string | null>(null);
  const correctRef = useRef(0);
  const answeredRef = useRef(0);
  const byKey = useMemo(() => new Map(pairs.map((p) => [p.key, p])), [pairs]);

  // An embedded node can be fed an empty pair list — hand back rather than
  // crash on rounds[0] below.
  useEffect(() => {
    if (pairs.length === 0) onComplete({ correct: 0, total: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pairs.length]);

  // Through a ref so an inline callback can't re-fire the effect (or go stale)
  // — the round only advances when the round actually changes.
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;
  useEffect(() => {
    onProgressRef.current?.({ index: roundIdx, total: rounds.length });
  }, [roundIdx, rounds.length]);

  const round = rounds[roundIdx] ?? [];
  const bothJapanese = variant === 'japanese';
  const tiles = useMemo<Tile[]>(
    () =>
      shuffle(
        (rounds[roundIdx] ?? []).flatMap((pair): Tile[] => [
          {
            id: `left-${pair.key}`,
            pairKey: pair.key,
            side: 'left',
            label: pair.left,
            speak: pair.leftSpeak,
            japanese: true,
          },
          {
            id: `right-${pair.key}`,
            pairKey: pair.key,
            side: 'right',
            label: pair.right,
            speak: pair.rightSpeak,
            japanese: bothJapanese,
          },
        ]),
      ),
    [rounds, roundIdx, bothJapanese],
  );

  const handleSelect = (tile: Tile) => {
    if (matched.has(tile.pairKey) || wrongId) return;
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
    if (selected.pairKey === tile.pairKey) {
      correctRef.current += 1;
      // The pair IS one item — grade it once, correct, so it advances the SRS.
      onGrade(true, byKey.get(tile.pairKey));
      const next = new Set([...matched, tile.pairKey]);
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
      // Blame the clicked tile so a struggled-with item comes back SOONER:
      // dropping the id here let games push a schedule forward but never reset it.
      const clickedPair = byKey.get(tile.pairKey);
      const selectedPair = byKey.get(selected.pairKey);
      onGrade(
        false,
        clickedPair,
        clickedPair && selectedPair
          ? {
              selected: { pair: selectedPair, side: selected.side },
              clicked: { pair: clickedPair, side: tile.side },
            }
          : undefined,
      );
      setWrongId(tile.id);
      setTimeout(() => {
        setWrongId(null);
        setSelected(null);
      }, 600);
    }
  };

  if (pairs.length === 0) return null;

  return (
    <Grid container spacing={1.5}>
      {tiles.map((tile) => {
        const isMatched = matched.has(tile.pairKey);
        const isSelected = selected?.id === tile.id;
        const isWrong = wrongId === tile.id || (!!wrongId && isSelected);
        return (
          <Grid size={{ xs: 6, sm: 4 }} key={tile.id}>
            <Box
              sx={{
                position: 'relative',
                p: 1.5,
                minHeight: 68,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 3,
                border: '2px solid',
                textAlign: 'center',
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
                // A touch device has no hover to leave: iPad Safari would keep
                // the last-tapped tile lit as if it were still selected.
                '@media (hover: hover)': {
                  '&:hover': !isMatched
                    ? { borderColor: brand[500], bgcolor: alpha(brand[300], 0.2) }
                    : {},
                },
              }}
            >
              {/* A real <button>, not a role="button" div: Safari spends the first
                  tap on the div's hover state. Under the content, not around it,
                  so the read-aloud button keeps its own click. */}
              <Box
                component="button"
                type="button"
                aria-label={tile.label}
                aria-pressed={isSelected}
                // aria-disabled, not disabled: the browser blurs a focused button as
                // it disables, dropping keyboard focus to the top of the page.
                aria-disabled={isMatched || undefined}
                tabIndex={isMatched ? -1 : 0}
                onClick={() => handleSelect(tile)}
                sx={{
                  position: 'absolute',
                  inset: 0,
                  p: 0,
                  border: 0,
                  background: 'none',
                  borderRadius: 'inherit',
                  cursor: isMatched ? 'default' : 'pointer',
                  '&:focus-visible': {
                    outline: `2px solid ${brand[600]}`,
                    outlineOffset: '-4px',
                  },
                }}
              />
              <Box
                sx={{
                  position: 'relative',
                  pointerEvents: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 0.5,
                  minWidth: 0,
                  maxWidth: '100%',
                }}
              >
                {isMatched ? (
                  <CheckIcon sx={{ fontSize: '1.2rem', color: 'success.main' }} />
                ) : (
                  <>
                    {/* The label is already the button's accessible name —
                        leaving it exposed reads every tile out twice. */}
                    <Typography
                      aria-hidden
                      sx={{
                        fontFamily: (th) => (tile.japanese ? th.fonts.jp : undefined),
                        fontSize: tile.japanese
                          ? bothJapanese
                            ? japaneseFontSize(tile.label)
                            : '1.05rem'
                          : '0.85rem',
                        minWidth: 0,
                        overflowWrap: 'break-word',
                      }}
                    >
                      {tile.label}
                    </Typography>
                    {tile.speak && (
                      <SpeakButton
                        text={tile.speak}
                        iconSize="0.9rem"
                        hitSlop={4}
                        sx={{
                          pointerEvents: 'auto',
                          '&.Mui-disabled': { pointerEvents: 'auto' },
                        }}
                      />
                    )}
                  </>
                )}
              </Box>
            </Box>
          </Grid>
        );
      })}
    </Grid>
  );
}
