'use client';
import CheckIcon from '@mui/icons-material/Check';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import { Box, Button, Chip, Grid, LinearProgress, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import { useEffect, useMemo, useRef, useState } from 'react';

import { SpeakButton } from '@/components/SpeakButton';
import { type BuddyReaction, StudyBuddy } from '@/components/StudyBuddy';
import { useXpAnimation } from '@/contexts/XpAnimationContext';
import { usePracticeQueue } from '@/hooks/usePracticeQueue';
import { useProgress, XP_PER_WRONG } from '@/hooks/useProgress';
import { useShop } from '@/hooks/useShop';
import { cardXp, getFlashcardDisplayText } from '@/lib/flashcardUtils';
import type { Flashcard } from '@/types/flashcard';

import { CelebrationScreen, pickPraise } from './CelebrationScreen';
import { RoundTransition } from './RoundTransition';

interface MatchModeProps {
  cards: Flashcard[];
  deckId: string;
  batchSize: number;
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
  const norm = (secs / pairs) * 10;
  if (norm < 30) return 'Lightning fast! ⚡';
  if (norm < 60) return 'Nice speed! 🚀';
  if (norm < 120) return 'Well done! 👏';
  return 'Keep it up! 💪';
}

export function MatchMode({ cards, deckId, batchSize, onExit }: MatchModeProps) {
  const theme = useTheme();
  const { brand, surfaces } = theme.palette;

  const queue = usePracticeQueue(cards, batchSize);

  // Per-round matching state
  const [selected, setSelected] = useState<Tile | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrong, setWrong] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  // Totals across all rounds
  const [totalTime, setTotalTime] = useState(0);

  const { equipped } = useShop();
  const equippedBuddy = equipped['study_buddy'];
  const [buddyReaction, setBuddyReaction] = useState<BuddyReaction>('idle');

  const { startSession, recordAnswer, endSession } = useProgress();
  // Stable per-session pick so the completion phrase doesn't flicker on re-render.
  const praiseSeed = useMemo(() => Math.floor(Math.random() * 1000), []);
  const { triggerXpEarned } = useXpAnimation();
  const sessionIdRef = useRef<string>('');
  const startTimeRef = useRef<number>(Date.now());
  const correctCountRef = useRef(0);
  const totalAnsweredRef = useRef(0);

  useEffect(() => {
    startSession(deckId, 'match').then((id) => {
      sessionIdRef.current = id;
      startTimeRef.current = Date.now();
    });
  }, [deckId, startSession]);

  // Build tiles for the current round
  const tiles = useMemo<Tile[]>(() => {
    const t: Tile[] = queue.currentCards.flatMap((c) => {
      const { titleText } = getFlashcardDisplayText(c);
      return [
        { id: `jp-${c.id}-r${queue.roundKey}`, cardId: c.id, side: 'jp' as Side, label: titleText },
        { id: `en-${c.id}-r${queue.roundKey}`, cardId: c.id, side: 'en' as Side, label: c.meaning },
      ];
    });
    return shuffle(t);
  }, [queue.currentCards, queue.roundKey]);

  const roundComplete = matched.size === queue.currentCards.length && queue.phase === 'playing';

  // Reset per-round state when a new round starts
  useEffect(() => {
    if (queue.roundKey === 0) return;
    setSelected(null);
    setMatched(new Set());
    setWrong(null);
    setElapsed(0);
  }, [queue.roundKey]);

  // Live timer
  useEffect(() => {
    if (roundComplete || queue.phase !== 'playing') return;
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [roundComplete, queue.phase]);

  // When round is complete, save time and tell the queue
  useEffect(() => {
    if (roundComplete) {
      setTotalTime((t) => t + elapsed);
      queue.finishRound();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundComplete]);

  // End session when all rounds done
  useEffect(() => {
    if (queue.phase === 'allDone' && sessionIdRef.current) {
      endSession(sessionIdRef.current, {
        cardsStudied: totalAnsweredRef.current,
        cardsCorrect: correctCountRef.current,
        durationSecs: totalTime,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue.phase]);

  const handleSelect = async (tile: Tile) => {
    if (matched.has(tile.cardId)) return;
    if (tile.id === selected?.id) {
      setSelected(null);
      return;
    }
    if (!selected) {
      setSelected(tile);
      return;
    }

    if (selected.cardId === tile.cardId && selected.side !== tile.side) {
      // Correct match
      setBuddyReaction('correct');
      setMatched((prev) => new Set([...prev, tile.cardId]));
      correctCountRef.current += 1;
      totalAnsweredRef.current += 1;
      queue.reportResult(tile.cardId, true);
      setSelected(null);

      const matchedCard = queue.currentCards.find((c) => c.id === tile.cardId);
      const xpAmount = cardXp(matchedCard?.jlptLevel);
      triggerXpEarned(xpAmount);

      if (sessionIdRef.current) {
        await recordAnswer(sessionIdRef.current, true, matchedCard?.jlptLevel, matchedCard?.id);
      }
    } else {
      // Wrong match — mark both cards as struggled
      setBuddyReaction('wrong');
      setWrong(tile.id);
      totalAnsweredRef.current += 1;
      queue.reportResult(selected.cardId, false);
      queue.reportResult(tile.cardId, false);

      triggerXpEarned(XP_PER_WRONG);

      if (sessionIdRef.current) {
        const attemptedCard = queue.currentCards.find((c) => c.id === tile.cardId);
        await recordAnswer(
          sessionIdRef.current,
          false,
          attemptedCard?.jlptLevel,
          attemptedCard?.id,
        );
      }
      setTimeout(() => {
        setWrong(null);
        setSelected(null);
      }, 600);
    }
  };

  const handleExit = async () => {
    if (sessionIdRef.current) {
      await endSession(sessionIdRef.current, {
        cardsStudied: totalAnsweredRef.current,
        cardsCorrect: correctCountRef.current,
        durationSecs: totalTime + elapsed,
      });
    }
    onExit();
  };

  // ── All rounds complete ────────────────────────────────────────────────────
  if (queue.phase === 'allDone') {
    const batchLabel = queue.totalBatches > 1 ? `${queue.totalBatches} rounds` : '1 round';
    return (
      <CelebrationScreen
        heading={pickPraise(1, praiseSeed).jp}
        headingEn="All matched!"
        subheading={`${queue.totalCards} pairs · ${batchLabel}`}
        extra={`⏱ ${formatTime(totalTime)} · ${speedLabel(totalTime, queue.totalCards)}`}
        mode="match"
        onExit={onExit}
      />
    );
  }

  // ── Between rounds ─────────────────────────────────────────────────────────
  if (queue.phase === 'roundEnd') {
    return (
      <RoundTransition
        batchIndex={queue.batchIndex}
        totalBatches={queue.totalBatches}
        isRetryRound={queue.isRetryRound}
        wrongCount={queue.lastRoundWrong}
        totalInRound={queue.lastRoundTotal}
        willRetry={queue.willRetry}
        onContinue={queue.nextRound}
        onExit={handleExit}
      />
    );
  }

  // ── Match grid ──────────────────────────────────────────────────────────────
  const overallProgress =
    queue.totalBatches > 1
      ? queue.batchIndex / queue.totalBatches +
        matched.size / queue.currentCards.length / queue.totalBatches
      : matched.size / queue.currentCards.length;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Typography variant="h5">Match</Typography>
          {queue.totalBatches > 1 && (
            <Chip
              label={`Batch ${queue.batchIndex + 1}/${queue.totalBatches}`}
              size="small"
              variant="outlined"
            />
          )}
          {queue.isRetryRound && (
            <Chip label="Review" size="small" color="warning" variant="outlined" />
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
          <Chip label={`${matched.size} / ${queue.currentCards.length}`} />
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
                ) : tile.side === 'jp' ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography
                      sx={{
                        fontFamily: '"Noto Serif JP", serif',
                        fontSize: '1.1rem',
                        color: 'text.primary',
                      }}
                    >
                      {tile.label}
                    </Typography>
                    <SpeakButton text={tile.label} iconSize="0.9rem" />
                  </Box>
                ) : (
                  <Typography
                    sx={{
                      fontFamily: '"DM Mono", monospace',
                      fontSize: '0.8rem',
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

      {equippedBuddy && <StudyBuddy buddyKey={equippedBuddy} reaction={buddyReaction} />}
    </Box>
  );
}
