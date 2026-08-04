'use client';
import HeadphonesIcon from '@mui/icons-material/Headphones';
import ReplayIcon from '@mui/icons-material/Replay';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import { Box, Button, Chip, IconButton, LinearProgress, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Loading } from '@/components/Loading';
import { useBuddyReaction } from '@/contexts/BuddyReactionContext';
import { useXpAnimation } from '@/contexts/XpAnimationContext';
import { usePracticeQueue } from '@/hooks/usePracticeQueue';
import { useProgress, XP_PER_WRONG } from '@/hooks/useProgress';
import { speechNeedsGesture, useJapaneseVoice, useSpeech } from '@/hooks/useSpeech';
import { buildMeaningChoices, cardXp, titleFontSize } from '@/lib/flashcardUtils';
import type { Flashcard } from '@/types/flashcard';

import { CelebrationScreen, pickPraise } from './CelebrationScreen';
import { ChoiceGrid } from './ChoiceGrid';
import { RoundTransition } from './RoundTransition';
import { XpEarnedPop } from './XpEarnedPop';

interface ListenModeProps {
  cards: Flashcard[];
  deckId: string;
  batchSize: number;
  onExit: () => void;
}

export function ListenMode({ cards, deckId, batchSize, onExit }: ListenModeProps) {
  const theme = useTheme();
  const { brand, surfaces } = theme.palette;
  const t = useTranslations('Practice.listenMode');
  const tCommon = useTranslations('Practice.common');

  const voiceStatus = useJapaneseVoice();
  const { speak, speaking } = useSpeech();
  const queue = usePracticeQueue(cards, batchSize);

  const [index, setIndex] = useState(0);
  const [choices, setChoices] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [roundScore, setRoundScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [xpPop, setXpPop] = useState<{ amount: number; correct: boolean; key: number } | null>(
    null,
  );
  // iOS only speaks from inside a user gesture, so the first question there waits
  // for a tap on the play button; every question after it auto-plays.
  const [unlocked, setUnlocked] = useState(() => !speechNeedsGesture());

  const { triggerReaction } = useBuddyReaction();

  const { startSession, recordAnswer, endSession } = useProgress();
  const praiseSeed = useMemo(() => Math.floor(Math.random() * 1000), []);
  const { triggerXpEarned } = useXpAnimation();
  const sessionIdRef = useRef<string>('');
  const startTimeRef = useRef<number>(Date.now());
  const correctCountRef = useRef(0);
  const totalAnsweredRef = useRef(0);

  // Card the audio has already been played for, so the auto-play effect doesn't
  // repeat a word the learner just triggered by hand.
  const playedForRef = useRef<string | null>(null);

  // Reset per-round state the moment a new round arrives — during render, not
  // in an effect. An effect reset left one render where `roundDone` was still
  // computed from the PREVIOUS round's index, and the finish effect below saw
  // it and ended the fresh retry round instantly with every card marked wrong.
  const [prevRoundKey, setPrevRoundKey] = useState(queue.roundKey);
  if (prevRoundKey !== queue.roundKey) {
    setPrevRoundKey(queue.roundKey);
    setIndex(0);
    setSelected(null);
    setRoundScore(0);
    playedForRef.current = null;
  }

  const card = queue.currentCards[index];
  const roundDone = index >= queue.currentCards.length;

  // Only open a session once we know the device can actually speak Japanese —
  // an unusable mode shouldn't leave an empty session in the student's history.
  useEffect(() => {
    if (voiceStatus !== 'ready') return;
    startSession(deckId, 'listen').then((id) => {
      sessionIdRef.current = id;
      startTimeRef.current = Date.now();
    });
  }, [deckId, startSession, voiceStatus]);

  useEffect(() => {
    if (card) setChoices(buildMeaningChoices(card, cards));
  }, [index, cards, queue.roundKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Speaking straight from the click handler keeps the call inside the user
  // gesture, which is what iOS requires.
  const play = useCallback(() => {
    if (!card) return;
    playedForRef.current = card.id;
    setUnlocked(true);
    speak(card.word);
  }, [card, speak]);

  // Auto-play each new question once speech is unlocked
  useEffect(() => {
    if (!card || voiceStatus !== 'ready' || !unlocked) return;
    if (playedForRef.current === card.id) return;
    playedForRef.current = card.id;
    speak(card.word);
    // Replays go through play(); this only fires when the question changes.
  }, [card?.id, queue.roundKey, voiceStatus, unlocked]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (roundDone && queue.phase === 'playing') {
      queue.finishRound();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundDone, queue.phase, queue.finishRound]);

  const next = useCallback(() => {
    setIndex((i) => i + 1);
    setSelected(null);
  }, []);

  // Auto-advance shortly after a correct pick, leaving time to read the reveal
  useEffect(() => {
    if (selected && card && selected === card.meaning) {
      const t = setTimeout(next, 1800);
      return () => clearTimeout(t);
    }
  }, [selected, card, next]);

  const handleSelect = useCallback(
    async (choice: string) => {
      if (selected || !card) return;
      setSelected(choice);
      const correct = choice === card.meaning;
      queue.reportResult(card.id, correct);
      totalAnsweredRef.current += 1;

      const xpAmount = correct ? cardXp(card.jlptLevel) : XP_PER_WRONG;
      setXpPop({ amount: xpAmount, correct, key: Date.now() });
      setTimeout(() => setXpPop(null), 1300);
      triggerXpEarned(xpAmount);

      triggerReaction(correct ? 'correct' : 'wrong');

      if (correct) {
        setRoundScore((s) => s + 1);
        correctCountRef.current += 1;
        setStreak((s) => {
          const nextStreak = s + 1;
          setBestStreak((b) => Math.max(b, nextStreak));
          return nextStreak;
        });
      } else {
        setStreak(0);
      }
      if (sessionIdRef.current) {
        await recordAnswer(sessionIdRef.current, correct, card.jlptLevel, card.id);
      }
    },
    [selected, card, recordAnswer, queue, triggerXpEarned, triggerReaction],
  );

  const handleExit = async () => {
    if (sessionIdRef.current) {
      await endSession(sessionIdRef.current, {
        cardsStudied: totalAnsweredRef.current,
        cardsCorrect: correctCountRef.current,
        durationSecs: Math.round((Date.now() - startTimeRef.current) / 1000),
      });
    }
    onExit();
  };

  useEffect(() => {
    if (queue.phase === 'allDone' && sessionIdRef.current) {
      endSession(sessionIdRef.current, {
        cardsStudied: totalAnsweredRef.current,
        cardsCorrect: correctCountRef.current,
        durationSecs: Math.round((Date.now() - startTimeRef.current) / 1000),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue.phase]);

  // ── No Japanese voice on this device ───────────────────────────────────────
  if (voiceStatus === 'checking') {
    return <Loading message={t('warmingUpVoice')} />;
  }

  if (voiceStatus === 'unavailable') {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Typography sx={{ fontSize: '3rem', mb: 1 }} aria-hidden>
          🔇
        </Typography>
        <Typography variant="h6" sx={{ mb: 1 }}>
          {t('noVoiceTitle')}
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3, maxWidth: 420, mx: 'auto' }}>
          {t('noVoiceBody')}
        </Typography>
        <Button variant="contained" size="large" onClick={onExit}>
          {t('pickAnotherGame')}
        </Button>
      </Box>
    );
  }

  // ── Round transition screen ────────────────────────────────────────────────
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

  // ── Completion screen ──────────────────────────────────────────────────────
  if (queue.phase === 'allDone') {
    const pct = queue.totalCards > 0 ? queue.firstAttemptCorrect / queue.totalCards : 0;
    const praise = pickPraise(pct, praiseSeed);
    return (
      <CelebrationScreen
        heading={praise.jp}
        headingEn={praise.en}
        subheading={tCommon('correctSummary', {
          correct: queue.firstAttemptCorrect,
          total: queue.totalCards,
        })}
        extra={bestStreak >= 3 ? tCommon('bestStreakRow', { count: bestStreak }) : undefined}
        mode="listen"
        onExit={onExit}
      />
    );
  }

  // ── Listening question ─────────────────────────────────────────────────────
  if (!card) return null;
  const answeredCorrectly = selected === card.meaning;
  const answeredWrong = !!selected && !answeredCorrectly;

  return (
    <Box sx={{ position: 'relative' }}>
      {xpPop && <XpEarnedPop amount={xpPop.amount} correct={xpPop.correct} show />}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
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
          {streak >= 2 && (
            <Chip label={`🔥 ${streak}`} size="small" color="warning" sx={{ fontWeight: 700 }} />
          )}
        </Box>
        <Chip label={`${roundScore} / ${queue.currentCards.length}`} />
      </Box>

      <LinearProgress
        variant="determinate"
        value={(index / queue.currentCards.length) * 100}
        sx={{
          mb: 3,
          height: 8,
          borderRadius: 4,
          bgcolor: alpha(brand[300], 0.12),
          '& .MuiLinearProgress-bar': { bgcolor: 'primary.main', borderRadius: 4 },
        }}
      />

      {/* Sound card — the Japanese stays hidden until the question is answered */}
      <Box
        sx={{
          border: '2px solid',
          borderColor: selected
            ? answeredCorrectly
              ? 'success.main'
              : 'error.main'
            : alpha(brand[300], 0.45),
          borderRadius: 3,
          p: 3,
          mb: 3,
          textAlign: 'center',
          bgcolor: surfaces.input,
          boxShadow: `0 8px 24px ${alpha(brand[300], 0.12)}`,
          transition: 'border-color 0.25s',
          overflow: 'hidden',
        }}
      >
        <IconButton
          onClick={play}
          aria-label={selected ? t('playWordAgainAria') : t('playWordAria')}
          sx={{
            width: 104,
            height: 104,
            mb: 1.5,
            color: 'primary.contrastText',
            background: `linear-gradient(135deg, ${brand[400]}, ${brand[600]})`,
            boxShadow: `0 10px 26px ${alpha(brand[500], 0.35)}`,
            '&:hover': { background: `linear-gradient(135deg, ${brand[500]}, ${brand[700]})` },
            ...(speaking && { animation: 'listenPulse 1s ease-in-out infinite' }),
            '@keyframes listenPulse': {
              '0%, 100%': { transform: 'scale(1)' },
              '50%': { transform: 'scale(1.06)' },
            },
          }}
        >
          {speaking ? (
            <VolumeUpIcon sx={{ fontSize: '3rem' }} />
          ) : (
            <HeadphonesIcon sx={{ fontSize: '3rem' }} />
          )}
        </IconButton>

        {selected ? (
          <Box>
            <Typography
              sx={{
                fontFamily: (t) => t.fonts.jp,
                fontSize:
                  card.cardType === 'phrase' ? '2.2rem' : titleFontSize(card.word, 2.2, 1.1),
                fontWeight: 700,
                color: 'text.primary',
                whiteSpace: card.cardType === 'phrase' ? undefined : 'nowrap',
              }}
            >
              {card.word}
            </Typography>
            {card.reading && (
              <Typography variant="body1" color="text.secondary">
                {card.reading}
              </Typography>
            )}
            <Typography variant="body1" sx={{ fontWeight: 600, mt: 0.5 }}>
              {card.meaning}
            </Typography>
          </Box>
        ) : (
          <Typography
            variant="caption"
            sx={{ color: 'text.secondary', letterSpacing: '0.12em', display: 'block' }}
          >
            {unlocked ? t('whatDidYouHear') : t('tapToHear')}
          </Typography>
        )}

        <Box sx={{ mt: 1 }}>
          <Button
            size="small"
            startIcon={<ReplayIcon />}
            onClick={play}
            sx={{ color: 'text.secondary' }}
          >
            {t('playAgain')}
          </Button>
        </Box>
      </Box>

      <ChoiceGrid
        choices={choices}
        correct={card.meaning}
        selected={selected}
        onSelect={handleSelect}
      />

      {answeredWrong && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <Button variant="contained" onClick={next} size="large">
            {index + 1 >= queue.currentCards.length ? t('seeResults') : t('nextArrow')}
          </Button>
        </Box>
      )}
      {answeredCorrectly && (
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <Typography variant="body2" color="success.main" sx={{ fontStyle: 'italic' }}>
            {tCommon('correctMovingOn')}
          </Typography>
        </Box>
      )}

      <Box sx={{ mt: 2, textAlign: 'right' }}>
        <Button size="small" onClick={handleExit} sx={{ color: 'text.secondary' }}>
          {tCommon('quitAndSave')}
        </Button>
      </Box>
    </Box>
  );
}
