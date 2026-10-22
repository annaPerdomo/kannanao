'use client';

import { Box, LinearProgress, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ComboChip } from '@/components/ComboChip';
import { MissExplainer } from '@/components/Practice/MissExplainer';
import { PracticeStage } from '@/components/PracticeStage';
import { useFuriganaMask } from '@/hooks/useFuriganaMask';
import { buildMeaningChoices, cardXp } from '@/lib/flashcardUtils';
import type { Flashcard } from '@/types/flashcard';

import { BossPrompt } from './BossPrompt';
import type { QuestGrade } from './types';

const ADVANCE_MS = 1100;

interface BossRoundProps {
  /** The boss cards (the last 3 due cards). */
  cards: Flashcard[];
  /** Whole-session card pool for building distractors. */
  pool: Flashcard[];
  comboCount: number;
  /** Records the answer normally (SRS + XP + combo) exactly like a warm-up card. */
  grade: QuestGrade;
  /** Batched double-XP: the sum of cardXp for every correct boss card, once. */
  onBossBonus: (amount: number) => void;
  onComplete: () => void;
  /** Quest step map (Warm-up/Word Match/Boss Round/Chest), rendered between the header and the progress bar. */
  questMap?: React.ReactNode;
}

/**
 * The Boss Round finale — the session's last 3 due cards, flipped from self-
 * grading to multiple choice. Each answer is recorded exactly as usual (so the
 * SRS sees it), and a correct boss card is worth double: its extra cardXp is
 * summed and awarded as one flat bonus at the end (never a multiplier).
 */
export function BossRound({
  cards,
  pool,
  comboCount,
  grade,
  onBossBonus,
  onComplete,
  questMap,
}: BossRoundProps) {
  const theme = useTheme();
  const { brand, accent } = theme.palette;
  const t = useTranslations('Review.bossRound');
  const isFuriganaMasked = useFuriganaMask(cards);

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const bonusRef = useRef(0);
  const completedRef = useRef(false);

  const card = cards[index];
  const choices = useMemo(
    () => (card ? buildMeaningChoices(card, pool) : []),
    // Rebuild only when the card changes.
    [index, pool], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const advance = useCallback(() => {
    if (index < cards.length - 1) {
      setIndex((i) => i + 1);
      setSelected(null);
      return;
    }
    // Guards a second "Got it" on the last card from paying the bonus twice.
    if (completedRef.current) return;
    completedRef.current = true;
    onBossBonus(bonusRef.current);
    onComplete();
  }, [index, cards.length, onBossBonus, onComplete]);

  const handleSelect = useCallback(
    (choice: string) => {
      if (selected || !card) return;
      setSelected(choice);
      const correct = choice === card.meaning;
      grade(correct, card.jlptLevel, card.id);
      if (correct) bonusRef.current += cardXp(card.jlptLevel);
    },
    [selected, card, grade],
  );

  const answeredWrong = !!selected && selected !== card?.meaning;

  // Only a correct reveal auto-advances; a miss waits for the explainer's button.
  useEffect(() => {
    if (!selected || answeredWrong) return;
    const t = setTimeout(advance, ADVANCE_MS);
    return () => clearTimeout(t);
  }, [selected, answeredWrong, advance]);

  if (!card) return null;

  return (
    <PracticeStage>
      {/* Darker "Boss Round" header treatment, from theme tokens. */}
      <Box
        sx={{
          borderRadius: 3,
          px: 3,
          py: 1.5,
          mb: 2,
          flexShrink: 0,
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          background: `linear-gradient(135deg, ${brand[800]} 0%, ${accent[900]} 100%)`,
          boxShadow: `0 8px 24px ${alpha(brand[900], 0.4)}`,
        }}
      >
        <Typography sx={{ fontWeight: 900, fontSize: '1.15rem', display: 'flex', gap: 0.75 }}>
          <Box component="span" aria-hidden>
            ⚔️
          </Box>
          {t('title')}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ComboChip count={comboCount} />
          <Typography sx={{ fontWeight: 700, opacity: 0.9 }}>
            {t('progress', { current: index + 1, total: cards.length })}
          </Typography>
        </Box>
      </Box>

      {questMap}

      <LinearProgress
        variant="determinate"
        value={(index / cards.length) * 100}
        sx={{
          mb: 2,
          flexShrink: 0,
          height: 8,
          borderRadius: 4,
          bgcolor: alpha(brand[300], 0.14),
          '& .MuiLinearProgress-bar': {
            borderRadius: 4,
            background: `linear-gradient(90deg, ${brand[600]}, ${accent[600]})`,
          },
        }}
      />

      {answeredWrong ? (
        <MissExplainer card={card} imageUrl={card.imageUrl} onContinue={advance} />
      ) : (
        <BossPrompt
          card={card}
          choices={choices}
          selected={selected}
          masked={isFuriganaMasked(card.id)}
          onSelect={handleSelect}
        />
      )}
    </PracticeStage>
  );
}
