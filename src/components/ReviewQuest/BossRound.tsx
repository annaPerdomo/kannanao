'use client';

import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { Box, Grid, LinearProgress, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ComboChip } from '@/components/ComboChip';
import { PracticeStage } from '@/components/PracticeStage';
import { SpeakButton } from '@/components/SpeakButton';
import TitleFurigana from '@/components/TitleFurigana';
import { useFuriganaMask } from '@/hooks/useFuriganaMask';
import {
  buildMeaningChoices,
  cardXp,
  getFlashcardDisplayText,
  titleFontSize,
} from '@/lib/flashcardUtils';
import type { Flashcard } from '@/types/flashcard';

import type { QuestGrade } from './types';

const CHOICE_LABELS = ['A', 'B', 'C', 'D'];
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
  const { brand, accent, surfaces } = theme.palette;
  const t = useTranslations('Review.bossRound');
  const isFuriganaMasked = useFuriganaMask(cards);

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const bonusRef = useRef(0);

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
    } else {
      // Award the batched boss bonus once, then hand back to the quest.
      onBossBonus(bonusRef.current);
      onComplete();
    }
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

  // Auto-advance after the reveal so the finale keeps moving.
  useEffect(() => {
    if (!selected) return;
    const t = setTimeout(advance, ADVANCE_MS);
    return () => clearTimeout(t);
  }, [selected, advance]);

  if (!card) return null;
  const display = getFlashcardDisplayText(card);

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

      {/* Prompt word — takes the slack so the choices below never leave the
          fold. Grow-only (`1 0 auto`): it clips its overflow, so shrinking
          would cut the word in half instead of scrolling. */}
      <Box
        sx={{
          flex: '1 0 auto',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          textAlign: 'center',
          p: 3,
          mb: 2,
          borderRadius: 3,
          border: `2px solid ${alpha(brand[300], 0.4)}`,
          bgcolor: surfaces.input,
          overflow: 'hidden',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
          <Typography
            sx={{
              fontFamily: (t) => t.fonts.jp,
              fontSize:
                card.cardType === 'phrase'
                  ? { xs: '2.1rem', sm: '3rem' }
                  : {
                      xs: titleFontSize(display.titleText, 2.1, 1.1),
                      sm: titleFontSize(display.titleText, 3.2, 1.4),
                    },
              fontWeight: 700,
              color: 'text.primary',
              whiteSpace: card.cardType === 'phrase' ? undefined : 'nowrap',
            }}
          >
            {display.titleFurigana ? (
              <TitleFurigana markup={display.titleFurigana} masked={isFuriganaMasked(card.id)} />
            ) : (
              display.titleText
            )}
          </Typography>
          <SpeakButton text={card.word} iconSize="1.3rem" />
        </Box>
        {display.subtitleText && !display.titleFurigana && (
          <Typography variant="body2" color="text.secondary">
            {display.subtitleText}
          </Typography>
        )}
        <Typography
          variant="caption"
          sx={{ color: 'text.secondary', letterSpacing: '0.12em', display: 'block', mt: 1 }}
        >
          {t('whatDoesThisMean')}
        </Typography>
      </Box>

      <Grid container spacing={1.5} sx={{ flexShrink: 0 }}>
        {choices.map((choice, i) => {
          const isCorrect = choice === card.meaning;
          const isSelected = selected === choice;
          let borderColor: string = alpha(brand[200], 0.7);
          let bgcolor: string = surfaces.input;
          let icon: React.ReactNode = null;
          if (selected) {
            if (isCorrect) {
              borderColor = theme.palette.success.main;
              bgcolor = alpha(theme.palette.success.main, 0.1);
              icon = <CheckIcon sx={{ color: 'success.main', flexShrink: 0 }} />;
            } else if (isSelected) {
              borderColor = theme.palette.error.main;
              bgcolor = alpha(theme.palette.error.main, 0.08);
              icon = <CloseIcon sx={{ color: 'error.main', flexShrink: 0 }} />;
            }
          }
          return (
            <Grid size={{ xs: 12, sm: 6 }} key={choice}>
              <Box
                role="button"
                tabIndex={selected ? -1 : 0}
                aria-label={choice}
                onClick={() => handleSelect(choice)}
                onKeyDown={(e) => {
                  if (!selected && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    handleSelect(choice);
                  }
                }}
                sx={{
                  p: 2,
                  border: '2px solid',
                  borderRadius: 2,
                  cursor: selected ? 'default' : 'pointer',
                  borderColor,
                  bgcolor,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  minHeight: 60,
                  transition: 'all 0.2s',
                  '&:hover': !selected
                    ? { borderColor: brand[500], bgcolor: alpha(brand[300], 0.15) }
                    : {},
                }}
              >
                {icon ?? (
                  <Box
                    sx={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      border: `2px solid ${alpha(brand[300], 0.4)}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                      {CHOICE_LABELS[i]}
                    </Typography>
                  </Box>
                )}
                <Typography sx={{ color: 'text.primary', flexGrow: 1 }}>{choice}</Typography>
              </Box>
            </Grid>
          );
        })}
      </Grid>
    </PracticeStage>
  );
}
