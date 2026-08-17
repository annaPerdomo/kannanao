'use client';
import CheckIcon from '@mui/icons-material/Check';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import { Box, Button, Chip, LinearProgress, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';

import { SpeakButton } from '@/components/SpeakButton';
import { useBuddyReaction } from '@/contexts/BuddyReactionContext';
import { useXpAnimation } from '@/contexts/XpAnimationContext';
import { REVIEW_MIX, usePracticeQueue } from '@/hooks/usePracticeQueue';
import { useProgress, XP_PER_WRONG } from '@/hooks/useProgress';
import { sampleBuddyWords } from '@/lib/buddyWords';
import { cardXp, getFlashcardDisplayText } from '@/lib/flashcardUtils';
import { shuffle } from '@/lib/reviewGames';
import type { Flashcard } from '@/types/flashcard';

import { CelebrationScreen, pickPraise } from './CelebrationScreen';
import { RoundTransition } from './RoundTransition';

interface MatchModeProps {
  cards: Flashcard[];
  deckId: string;
  batchSize: number;
  onExit: () => void;
}

interface TileBase {
  id: string;
  cardId: string;
  label: string;
}

// The JP side carries its own TTS text because `label` may be romaji depending
// on the card's view mode. Keeping `speak` on that variant only means a JP tile
// can't be built without it.
type Tile = (TileBase & { side: 'jp'; speak: string }) | (TileBase & { side: 'en' });

// Kana and kanji render about twice as wide as a latin character, so a raw
// character count would shrink long romaji while letting equally wide kanji
// overflow the tile.
function isWideGlyph(ch: string): boolean {
  const cp = ch.codePointAt(0) ?? 0;
  return (
    (cp >= 0x3000 && cp <= 0x30ff) || // CJK punctuation, hiragana, katakana
    (cp >= 0x3400 && cp <= 0x9fff) || // kanji
    (cp >= 0xff01 && cp <= 0xff60) // fullwidth forms
  );
}

/** Roughly 14 latin characters, or 7 kanji. */
const JP_TILE_SHRINK_WIDTH = 14;

function glyphWidth(label: string): number {
  return [...label].reduce((w, ch) => w + (isWideGlyph(ch) ? 2 : 1), 0);
}

/**
 * A tile's height is fixed, so the type steps down as the label grows rather
 * than spilling past the border. The phone board is a third of the row wide and
 * steps sooner: にゅうきょしゃ needs four lines at the desktop size, two here.
 */
export function jpLabelFontSize(label: string) {
  const width = glyphWidth(label);
  return {
    xs: width > 10 ? '0.8rem' : width > 6 ? '0.95rem' : '1.1rem',
    sm: width > JP_TILE_SHRINK_WIDTH ? '0.9rem' : '1.1rem',
  };
}

/** Same for the English side, which carries the long comma-separated glosses. */
export function enLabelFontSize(label: string) {
  const len = label.length;
  return {
    xs: len > 34 ? '0.62rem' : len > 26 ? '0.7rem' : len > 16 ? '0.75rem' : '0.85rem',
    sm: '0.8rem',
  };
}

/**
 * Scrolling to find the other half of a pair is not a memory game, so a phone
 * board is the whole screen and nothing below it: three columns over four rows,
 * with the rows sized from the height actually left over. A batch simply plays
 * as several quick rounds. From sm up the full batch fits, on fixed-height tiles.
 */
export const PHONE_BOARD_ROWS = 4;
export const PHONE_COLS = 3;
/**
 * Under 360px a third of a row clipped the long comma-separated glosses
 * ("burnable garbage, combustible waste"), which is worse than scrolling.
 */
export const NARROW_COLS = 2;

/**
 * The queue mixes REVIEW_MIX mastered cards into every round after the first, so
 * a round sized to fill the board exactly would overflow it from round two on.
 */
function pairsForBoard(cols: number): number {
  return (PHONE_BOARD_ROWS * cols) / 2 - REVIEW_MIX;
}
export const PHONE_PAIRS_PER_ROUND = pairsForBoard(PHONE_COLS);
export const NARROW_PAIRS_PER_ROUND = pairsForBoard(NARROW_COLS);
const TILE_GAP_PX = 12;
/** Below this a tile stops being a comfortable tap target. */
const TILE_MIN_PX = 64;
/** Past this a tile is just a big empty box, so tall screens keep the slack. */
const TILE_MAX_PX = 120;

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`;
}

function speedLabelKey(secs: number, pairs: number): string {
  const norm = (secs / pairs) * 10;
  if (norm < 30) return 'speedLightning';
  if (norm < 60) return 'speedNice';
  if (norm < 120) return 'speedWellDone';
  return 'speedKeepUp';
}

export function MatchMode({ cards, deckId, batchSize, onExit }: MatchModeProps) {
  const t = useTranslations('Practice.matchMode');
  const tCommon = useTranslations('Practice.common');
  const theme = useTheme();
  const { brand, surfaces } = theme.palette;

  // noSsr: the mode only mounts after the client-side card fetch, so there is
  // no server render to disagree with, and the first render has to know the
  // real width — the queue takes its batch from it exactly once.
  const isPhone = useMediaQuery(theme.breakpoints.down('sm'), { noSsr: true });
  const isNarrow = useMediaQuery('(max-width:359.95px)', { noSsr: true });
  const cols = isNarrow ? NARROW_COLS : PHONE_COLS;
  // Frozen on mount. The queue re-slices its batch list when this changes but
  // keeps `batchIndex` and the dealt round in state, so rotating the phone
  // mid-game would leave the index past the end of the new list and jump to the
  // finish screen with cards undealt. Only the size is fixed, not the layout.
  const [pairsPerRound] = useState(() =>
    isPhone
      ? Math.min(batchSize, isNarrow ? NARROW_PAIRS_PER_ROUND : PHONE_PAIRS_PER_ROUND)
      : batchSize,
  );
  const queue = usePracticeQueue(cards, pairsPerRound);

  // Per-round matching state
  const [selected, setSelected] = useState<Tile | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrong, setWrong] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  // Totals across all rounds
  const [totalTime, setTotalTime] = useState(0);

  const { triggerReaction, markMissed } = useBuddyReaction();

  // Rows come from the tiles actually dealt (a short final round still fills
  // the board), per breakpoint since the column count changes.
  const tileCount = queue.currentCards.length * 2;
  const boardMaxHeight = (columns: number) => {
    const rows = Math.max(1, Math.ceil(tileCount / columns));
    return `${rows * TILE_MAX_PX + (rows - 1) * TILE_GAP_PX}px`;
  };

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
      const { titleText, speakText } = getFlashcardDisplayText(c);
      return [
        {
          id: `jp-${c.id}-r${queue.roundKey}`,
          cardId: c.id,
          side: 'jp' as const,
          label: titleText,
          speak: speakText,
        },
        {
          id: `en-${c.id}-r${queue.roundKey}`,
          cardId: c.id,
          side: 'en' as const,
          label: c.meaning,
        },
      ];
    });
    return shuffle(t);
  }, [queue.currentCards, queue.roundKey]);

  // Reset per-round state the moment a new round arrives — during render, not
  // in an effect. An effect reset left one render where `roundComplete` was
  // still computed from the PREVIOUS round's matched set; when its size matched
  // the new round's length, the finish effect ended the fresh round instantly
  // with every card marked wrong.
  const [prevRoundKey, setPrevRoundKey] = useState(queue.roundKey);
  if (prevRoundKey !== queue.roundKey) {
    setPrevRoundKey(queue.roundKey);
    setSelected(null);
    setMatched(new Set());
    setWrong(null);
    setElapsed(0);
  }

  const roundComplete = matched.size === queue.currentCards.length && queue.phase === 'playing';

  // Live timer
  useEffect(() => {
    if (roundComplete || queue.phase !== 'playing') return;
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(timer);
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
        sampleWords: sampleBuddyWords(queue.studiedCards()),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue.phase]);

  const handleSelect = async (tile: Tile) => {
    // Lock input during the wrong-flash: `selected` is only cleared by the
    // 600ms timeout below, so a tap in that window would re-grade against the
    // stale selection (double XP + a duplicate wrong report).
    if (matched.has(tile.cardId) || wrong) return;
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
      triggerReaction('correct', tile.cardId);
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
      triggerReaction('wrong', tile.cardId);
      markMissed(selected.cardId);
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
        sampleWords: sampleBuddyWords(queue.studiedCards()),
      });
    }
    onExit();
  };

  // ── All rounds complete ────────────────────────────────────────────────────
  if (queue.phase === 'allDone') {
    const roundsLabel = t('roundsCount', { count: queue.totalBatches });
    return (
      <CelebrationScreen
        heading={pickPraise(1, praiseSeed).jp}
        headingEn={t('allMatched')}
        subheading={t('pairsSummary', { count: queue.totalCards, rounds: roundsLabel })}
        extra={t('timeSpeed', {
          time: formatTime(totalTime),
          speed: t(speedLabelKey(totalTime, queue.totalCards)),
        })}
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
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: { xs: 1, sm: 1.5 },
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          {queue.totalBatches > 1 && (
            <Chip
              label={tCommon('batchChip', {
                current: queue.batchIndex + 1,
                total: queue.totalBatches,
              })}
              size="small"
              variant="outlined"
            />
          )}
          {queue.isRetryRound && (
            <Chip label={tCommon('reviewChip')} size="small" color="warning" variant="outlined" />
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
          mb: { xs: 1.5, sm: 2 },
          flexShrink: 0,
          height: 8,
          borderRadius: 4,
          bgcolor: alpha(brand[300], 0.12),
          '& .MuiLinearProgress-bar': { bgcolor: 'primary.main', borderRadius: 4 },
        }}
      />

      {/* No `minHeight: 0`: a round with more rows than the viewport can hold
          (a full-deck batch) must push the stage taller and scroll the page,
          not spill tiles over the quit button. */}
      <Box
        sx={{
          flex: 1,
          alignSelf: 'center',
          width: '100%',
          display: 'grid',
          gap: `${TILE_GAP_PX}px`,
          gridTemplateColumns: {
            xs: `repeat(${cols}, minmax(0, 1fr))`,
            sm: 'repeat(3, minmax(0, 1fr))',
            md: 'repeat(4, minmax(0, 1fr))',
          },
          // `auto` min, not the tap-target floor: a long English gloss has to be
          // able to push its row taller than the height the board was dealt.
          gridAutoRows: 'minmax(auto, 1fr)',
          maxHeight: {
            xs: boardMaxHeight(cols),
            sm: boardMaxHeight(3),
            md: boardMaxHeight(4),
          },
        }}
      >
        {tiles.map((tile) => {
          const isMatched = matched.has(tile.cardId);
          const isSelected = selected?.id === tile.id;
          const isWrong = wrong === tile.id || (!!wrong && selected?.id === tile.id);
          return (
            <Box
              key={tile.id}
              sx={{
                position: 'relative',
                p: { xs: 1, sm: 1.5 },
                border: '2px solid',
                borderRadius: 3,
                textAlign: 'center',
                minWidth: 0,
                minHeight: `${TILE_MIN_PX}px`,
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
                // A touch device has no hover to leave: iPad Safari would keep
                // the last-tapped tile lit as if it were still selected.
                '@media (hover: hover)': {
                  '&:hover': !isMatched
                    ? { borderColor: brand[500], bgcolor: alpha(brand[300], 0.2) }
                    : {},
                },
              }}
            >
              {/* The tile's button sits under the content rather than wrapping
                  it: nesting the read-aloud button inside would swallow its own
                  click and Enter/Space. */}
              <Box
                component="button"
                type="button"
                aria-label={tile.label}
                aria-pressed={isSelected}
                // aria-disabled, not disabled: the browser blurs a focused
                // button as it disables, dropping keyboard focus to the top
                // of the page on every match.
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
                ) : tile.side === 'jp' ? (
                  <>
                    {/* The label is already the button's accessible name —
                        leaving it exposed reads every tile out twice. */}
                    <Typography
                      aria-hidden
                      sx={{
                        fontFamily: '"Noto Serif JP", serif',
                        fontSize: jpLabelFontSize(tile.label),
                        color: 'text.primary',
                        minWidth: 0,
                        overflowWrap: 'break-word',
                      }}
                    >
                      {tile.label}
                    </Typography>
                    <SpeakButton
                      text={tile.speak}
                      iconSize="0.9rem"
                      hitSlop={4}
                      sx={{ pointerEvents: 'auto', '&.Mui-disabled': { pointerEvents: 'auto' } }}
                    />
                  </>
                ) : (
                  <Typography
                    aria-hidden
                    sx={{
                      fontFamily: '"DM Mono", monospace',
                      fontSize: enLabelFontSize(tile.label),
                      color: 'text.primary',
                      minWidth: 0,
                      overflowWrap: 'break-word',
                    }}
                  >
                    {tile.label}
                  </Typography>
                )}
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* Left, not right: the floating buddy parks over the bottom-right corner. */}
      <Box sx={{ mt: { xs: 1, sm: 1.5 }, flexShrink: 0, textAlign: 'left' }}>
        <Button size="small" color="inherit" onClick={handleExit} sx={{ opacity: 0.5 }}>
          {tCommon('quitAndSave')}
        </Button>
      </Box>
    </Box>
  );
}
