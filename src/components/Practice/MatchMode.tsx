'use client';
import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  Chip,
  LinearProgress,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import CheckIcon from '@mui/icons-material/Check';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import type { Flashcard } from '@/types/flashcard';
import { getFlashcardDisplayText } from '@/lib/flashcardUtils';
import { useProgress } from '@/hooks/useProgess';
import { CelebrationScreen } from './CelebrationScreen';

const ROUND_SIZE = 10;

interface MatchModeProps {
  cards: Flashcard[];
  deckId: string;
  onExit: () => void;
}

type Side = 'jp' | 'en';

interface Tile {
  id: string;
  cardId: string;
  side: Side;
  label: string;
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`;
}

function speedLabel(secs: number, pairs: number): string {
  // normalise to 10-pair equivalent so speed feels consistent regardless of round size
  const norm = (secs / pairs) * 10;
  if (norm < 30) return 'Lightning fast! ⚡';
  if (norm < 60) return 'Nice speed! 🚀';
  if (norm < 120) return 'Well done! 👏';
  return 'Keep it up! 💪';
}

export function MatchMode({ cards, deckId, onExit }: MatchModeProps) {
  const theme = useTheme();
  const { brand, surfaces } = theme.palette;

  // Shuffle once and split into rounds
  const pool = useMemo(() => shuffle([...cards]), [cards]);
  const rounds = useMemo<Flashcard[][]>(() => {
    const result: Flashcard[][] = [];
    for (let i = 0; i < pool.length; i += ROUND_SIZE) {
      result.push(pool.slice(i, i + ROUND_SIZE));
    }
    return result;
  }, [pool]);

  const [roundIndex, setRoundIndex] = useState(0);
  const [roundDone, setRoundDone] = useState(false);

  // Per-round state
  const [selected, setSelected] = useState<Tile | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrong, setWrong] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [roundTime, setRoundTime] = useState<number | null>(null);

  // Total across all rounds
  const [totalScore, setTotalScore] = useState(0);
  const [totalTime, setTotalTime] = useState(0);

  const { startSession, recordAnswer, endSession } = useProgress();
  const sessionIdRef = useRef<string>('');
  const startTimeRef = useRef<number>(Date.now());
  const correctCountRef = useRef(0);
  const totalStudiedRef = useRef(0);
  const recordedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    startSession(deckId, 'match').then((id) => {
      sessionIdRef.current = id;
      startTimeRef.current = Date.now();
    });
  }, [deckId, startSession]);

  const currentCards = rounds[roundIndex] ?? [];
  const allDone = roundIndex >= rounds.length;

  // Build tiles for the current round (key includes roundIndex so tiles re-render on round change)
  const tiles = useMemo<Tile[]>(() => {
    const t: Tile[] = currentCards.flatMap((c) => {
      const { titleText } = getFlashcardDisplayText(c);
      return [
        { id: `jp-${c.id}-r${roundIndex}`, cardId: c.id, side: 'jp', label: titleText },
        { id: `en-${c.id}-r${roundIndex}`, cardId: c.id, side: 'en', label: c.meaning },
      ];
    });
    return shuffle(t);
  }, [currentCards, roundIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  const roundComplete = !allDone && matched.size === currentCards.length;

  // Live timer — reset when round advances
  useEffect(() => {
    if (roundComplete || allDone) return;
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [roundComplete, allDone, roundIndex]);

  // When a round is completed, record the time and mark done
  useEffect(() => {
    if (roundComplete && !roundDone) {
      setRoundDone(true);
      setRoundTime(elapsed);
      setTotalTime((t) => t + elapsed);
    }
  }, [roundComplete, roundDone, elapsed]);

  // End the session when all rounds are done
  useEffect(() => {
    if (allDone && sessionIdRef.current) {
      endSession(sessionIdRef.current, {
        cardsStudied: totalStudiedRef.current,
        cardsCorrect: correctCountRef.current,
        durationSecs: totalTime,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allDone]);

  const advanceRound = () => {
    setRoundIndex((i) => i + 1);
    setRoundDone(false);
    setSelected(null);
    setMatched(new Set());
    setWrong(null);
    setElapsed(0);
    setRoundTime(null);
    recordedRef.current = new Set();
  };

  const handleSelect = async (tile: Tile) => {
    if (matched.has(tile.cardId)) return;
    if (tile.id === selected?.id) { setSelected(null); return; }
    if (!selected) { setSelected(tile); return; }

    if (selected.cardId === tile.cardId && selected.side !== tile.side) {
      // Correct match
      setMatched((prev) => new Set([...prev, tile.cardId]));
      setTotalScore((s) => s + 1);
      correctCountRef.current += 1;
      setSelected(null);

      if (sessionIdRef.current && !recordedRef.current.has(tile.cardId)) {
        recordedRef.current.add(tile.cardId);
        const matchedCard = currentCards.find((c) => c.id === tile.cardId);
        await recordAnswer(sessionIdRef.current, true, matchedCard?.jlptLevel);
      }
    } else {
      // Wrong match
      setWrong(tile.id);
      if (sessionIdRef.current && selected) {
        const attemptedCard = currentCards.find((c) => c.id === tile.cardId);
        await recordAnswer(sessionIdRef.current, false, attemptedCard?.jlptLevel);
        totalStudiedRef.current += 1;
      }
      setTimeout(() => { setWrong(null); setSelected(null); }, 600);
    }
  };

  const handleExit = async () => {
    if (sessionIdRef.current) {
      await endSession(sessionIdRef.current, {
        cardsStudied: totalStudiedRef.current,
        cardsCorrect: correctCountRef.current,
        durationSecs: totalTime + elapsed,
      });
    }
    onExit();
  };

  // ── All rounds complete ────────────────────────────────────────────────────
  if (allDone) {
    const roundsLabel = rounds.length > 1 ? `${rounds.length} rounds` : '1 round';
    return (
      <CelebrationScreen
        heading="All matched!"
        subheading={`${pool.length} pairs · ${roundsLabel}`}
        extra={`⏱ ${formatTime(totalTime)} · ${speedLabel(totalTime, pool.length)}`}
        mode="match"
        onExit={onExit}
      />
    );
  }

  // ── Between rounds ────────────────────────────────────────────────────────
  if (roundDone) {
    const isLastRound = roundIndex === rounds.length - 1;
    return (
      <Box
        sx={{
          textAlign: 'center',
          py: 6,
          animation: 'roundSlideIn 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
          '@keyframes roundSlideIn': {
            from: { transform: 'scale(0.8) translateY(20px)', opacity: 0 },
            to:   { transform: 'scale(1)   translateY(0)',    opacity: 1 },
          },
        }}
      >
        <Box
          sx={{
            fontSize: 64,
            lineHeight: 1,
            mb: 2,
            userSelect: 'none',
            display: 'inline-block',
            animation: 'spinIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s both',
            '@keyframes spinIn': {
              from: { transform: 'scale(0) rotate(-180deg)', opacity: 0 },
              to:   { transform: 'scale(1) rotate(0deg)',    opacity: 1 },
            },
          }}
        >
          ✨
        </Box>
        <Typography variant="h4" sx={{ mb: 1, fontWeight: 700 }}>
          Round {roundIndex + 1} done!
        </Typography>
        {rounds.length > 1 && (
          <Typography color="text.secondary" sx={{ mb: 1 }}>
            {roundIndex + 1} of {rounds.length} rounds
          </Typography>
        )}
        {roundTime !== null && (
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1,
              px: 2.5,
              py: 1,
              borderRadius: 3,
              bgcolor: alpha(brand[300], 0.12),
              border: `1px solid ${alpha(brand[300], 0.3)}`,
              mb: 3,
              mt: 1,
            }}
          >
            <TimerOutlinedIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} />
            <Typography variant="body1" sx={{ fontWeight: 700 }}>
              {formatTime(roundTime)}
            </Typography>
          </Box>
        )}
        <Box>
          <Button variant="contained" size="large" onClick={advanceRound}>
            {isLastRound ? 'Last round — go! 🚀' : `Round ${roundIndex + 2} →`}
          </Button>
        </Box>
      </Box>
    );
  }

  // ── Match grid ──────────────────────────────────────────────────────────────
  const overallProgress =
    (roundIndex * ROUND_SIZE + matched.size) / pool.length;

  return (
    <Box>
      <Box
        sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h5">Match</Typography>
          {rounds.length > 1 && (
            <Chip
              label={`Round ${roundIndex + 1}/${rounds.length}`}
              size="small"
              variant="outlined"
            />
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <TimerOutlinedIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} />
            <Typography
              variant="body2"
              sx={{ color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}
            >
              {formatTime(elapsed)}
            </Typography>
          </Box>
          <Chip label={`${matched.size} / ${currentCards.length}`} />
        </Box>
      </Box>

      {/* Overall progress bar across all rounds */}
      <LinearProgress
        variant="determinate"
        value={overallProgress * 100}
        sx={{
          mb: 3,
          height: 8,
          borderRadius: 4,
          bgcolor: alpha(brand[300], 0.12),
          '& .MuiLinearProgress-bar': { bgcolor: 'primary.main', borderRadius: 4 },
        }}
      />

      <Grid container spacing={1.5}>
        {tiles.map((tile) => {
          const isMatched = matched.has(tile.cardId);
          const isSelected = selected?.id === tile.id;
          const isWrong = wrong === tile.id || (!!wrong && selected?.id === tile.id);
          return (
            <Grid size={{ xs: 6, sm: 4, md: 3 }} key={tile.id}>
              <Box
                onClick={() => !isMatched && handleSelect(tile)}
                sx={{
                  p: 2,
                  border: '2px solid',
                  borderRadius: 3,
                  textAlign: 'center',
                  cursor: isMatched ? 'default' : 'pointer',
                  minHeight: 72,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
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
                ) : (
                  <Typography
                    sx={{
                      fontFamily:
                        tile.side === 'jp' ? '"Noto Serif JP", serif' : '"DM Mono", monospace',
                      fontSize: tile.side === 'jp' ? '1.1rem' : '0.8rem',
                      color: 'text.primary',
                    }}
                  >
                    {tile.label}
                  </Typography>
                )}
              </Box>
            </Grid>
          );
        })}
      </Grid>

      <Box sx={{ mt: 3, textAlign: 'right' }}>
        <Button size="small" color="inherit" onClick={handleExit} sx={{ opacity: 0.5 }}>
          Quit &amp; Save Progress
        </Button>
      </Box>
    </Box>
  );
}
