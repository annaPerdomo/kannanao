'use client';
import CheckIcon from '@mui/icons-material/Check';
import { Box, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';

import type { QuestLeg, QuestStep } from '@/lib/assignmentQuest';

const STEP_EMOJI: Record<QuestStep, string> = {
  warmup: '🔖',
  practice: '🍉',
  goal: '🎯',
};

interface QuestStepBannerProps {
  legs: QuestLeg[];
  /** Index of the leg being played. */
  currentIndex: number;
}

/**
 * The one line of quest chrome on a leg's page: where the learner is now and
 * how much is left. Same node-path language as the review quest map, shrunk to
 * a banner so the mode below it keeps the full screen.
 */
export function QuestStepBanner({ legs, currentIndex }: QuestStepBannerProps) {
  const t = useTranslations('AssignmentQuest');
  const theme = useTheme();
  const { brand, accent } = theme.palette;
  if (legs.length === 0) return null;

  const current = legs[currentIndex];

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1.5,
        mb: 3,
        px: 2,
        py: 1,
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
              key={leg.step}
              sx={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.95rem',
                border: active ? `2px solid ${accent[500]}` : `2px solid ${alpha(brand[300], 0.5)}`,
                bgcolor: done
                  ? alpha(theme.palette.success.main, 0.15)
                  : active
                    ? alpha(accent[300], 0.25)
                    : alpha(brand[100], 0.5),
              }}
            >
              {done ? (
                <CheckIcon sx={{ fontSize: '1rem', color: 'success.main' }} />
              ) : (
                STEP_EMOJI[leg.step]
              )}
            </Box>
          );
        })}
      </Box>

      <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: 'text.primary' }}>
        {t('stepOf', { current: currentIndex + 1, total: legs.length })}
        {current ? ` · ${t(`stepName.${current.step}`)}` : ''}
      </Typography>
    </Box>
  );
}
