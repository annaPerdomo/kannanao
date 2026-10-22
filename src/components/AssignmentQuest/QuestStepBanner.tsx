'use client';
import CheckIcon from '@mui/icons-material/Check';
import { Box, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';

import { useChainModeText } from '@/hooks/useChainModeText';
import { MODE_EMOJI } from '@/lib/chainModes';
import type { ChainKind, ChainLeg, ChainStep } from '@/lib/practiceChain';

const STEP_EMOJI: Record<ChainStep, string> = {
  review: '⚔️',
  warmup: '🔖',
  practice: '🍉',
  goal: '🎯',
};

interface QuestStepBannerProps {
  legs: ChainLeg[];
  currentIndex: number;
  kind: ChainKind;
}

/** The review quest's node path, shrunk to one line so the mode keeps the screen. */
export function QuestStepBanner({ legs, currentIndex, kind }: QuestStepBannerProps) {
  const t = useTranslations('AssignmentQuest');
  const modeText = useChainModeText();
  const theme = useTheme();
  const { brand, accent } = theme.palette;
  if (legs.length === 0) return null;

  const current = legs[currentIndex];
  if (!current) return null;
  const caption =
    kind === 'assignment' ? t(`stepName.${current.step}`) : modeText(current.mode).label;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: { xs: 1, sm: 1.5 },
        mb: { xs: 2, sm: 3 },
        px: 2,
        py: { xs: 0.75, sm: 1 },
        borderRadius: theme.radii.md,
        bgcolor: alpha(brand[100], 0.55),
        border: `1px solid ${alpha(brand[300], 0.45)}`,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }} aria-hidden>
        {legs.map((leg, i) => {
          const done = i < currentIndex;
          const active = i === currentIndex;
          return (
            <Box
              // Index, not step: a mixed session has several practice legs.
              key={i}
              sx={{
                width: { xs: 24, sm: 28 },
                height: { xs: 24, sm: 28 },
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: { xs: '0.85rem', sm: '0.95rem' },
                border: active ? `2px solid ${accent[500]}` : `2px solid ${alpha(brand[300], 0.5)}`,
                bgcolor: done
                  ? alpha(theme.palette.success.main, 0.15)
                  : active
                    ? alpha(accent[300], 0.25)
                    : alpha(brand[100], 0.5),
                animation: active ? 'questDotPulse 1.6s ease-in-out infinite' : 'none',
                '@keyframes questDotPulse': {
                  '0%, 100%': { transform: 'scale(1)' },
                  '50%': { transform: 'scale(1.12)' },
                },
                '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
              }}
            >
              {done ? (
                <CheckIcon sx={{ fontSize: '1rem', color: 'success.main' }} />
              ) : kind === 'assignment' ? (
                STEP_EMOJI[leg.step]
              ) : (
                MODE_EMOJI[leg.mode]
              )}
            </Box>
          );
        })}
      </Box>

      <Typography
        sx={{ fontSize: { xs: '0.78rem', sm: '0.85rem' }, fontWeight: 700, color: 'text.primary' }}
      >
        {t('stepOf', { current: currentIndex + 1, total: legs.length })} · {caption}
      </Typography>
    </Box>
  );
}
