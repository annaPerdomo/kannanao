'use client';
import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import type { PracticeMode } from '@/types/app';

const MODE_EMOJI: Record<PracticeMode, string> = {
  match: '🎯',
  fill: '✏️',
  recall: '🌟',
  'kotoba-bubble': '🫧',
  quiz: '📝',
  listen: '🎧',
  reading: '📖',
};

interface BatchPickerProps {
  totalCards: number;
  mode: PracticeMode;
  onSelect: (batchSize: number) => void;
  /** Override the default icon above the heading */
  icon?: ReactNode;
  /** Extra content rendered below the batch options (e.g. organizer controls) */
  footer?: ReactNode;
}

interface BatchOption {
  size: number;
  descKey: string;
  all?: boolean;
  recommended?: boolean;
}

function getOptions(totalCards: number, mode: PracticeMode): BatchOption[] {
  // Match mode caps at 10 (20 tiles on screen gets crowded)
  // Kotoba Bubble caps at 15 (sentence-based, not card-based)
  const maxBatch = mode === 'match' ? 10 : mode === 'kotoba-bubble' ? 15 : 20;
  const options: BatchOption[] = [];

  if (totalCards > 5) options.push({ size: 5, descKey: 'quickReview' });
  if (totalCards > 10) options.push({ size: 10, descKey: 'recommended', recommended: true });
  if (maxBatch >= 20 && totalCards > 20) options.push({ size: 20, descKey: 'challenge' });

  options.push({ size: totalCards, descKey: 'fullDeck', all: true });

  return options;
}

export function BatchPicker({ totalCards, mode, onSelect, icon, footer }: BatchPickerProps) {
  const t = useTranslations('Practice.batchPicker');
  const theme = useTheme();
  const { brand, surfaces } = theme.palette;

  const options = getOptions(totalCards, mode);

  const defaultIcon = (
    <Typography
      sx={{
        fontSize: '3rem',
        lineHeight: 1,
        mb: 2,
        display: 'inline-block',
        animation: 'popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        '@keyframes popIn': {
          from: { transform: 'scale(0)', opacity: 0 },
          to: { transform: 'scale(1)', opacity: 1 },
        },
      }}
    >
      {MODE_EMOJI[mode]}
    </Typography>
  );

  return (
    <Box sx={{ textAlign: 'center', py: 4 }}>
      {icon ?? defaultIcon}

      <Typography variant="h5" sx={{ mb: 0.5, fontWeight: 700, color: 'text.primary' }}>
        {t('heading')}
      </Typography>
      <Typography sx={{ mb: 3, color: 'text.secondary' }}>
        {t('subheading', { count: totalCards })}
      </Typography>

      <Stack spacing={1.5} sx={{ maxWidth: 340, mx: 'auto' }}>
        {options.map((opt) => (
          <Button
            key={opt.size}
            variant={opt.recommended ? 'contained' : 'outlined'}
            size="large"
            onClick={() => onSelect(opt.size)}
            sx={{
              justifyContent: 'space-between',
              px: 3,
              py: 1.5,
              borderRadius: 2.5,
              textTransform: 'none',
              fontSize: '1rem',
              ...(opt.recommended
                ? {}
                : {
                    borderColor: alpha(brand[300], 0.4),
                    color: 'text.primary',
                    bgcolor: surfaces.input,
                    '&:hover': {
                      borderColor: brand[500],
                      bgcolor: alpha(brand[300], 0.12),
                    },
                  }),
            }}
          >
            <span>
              {opt.all ? t('allCards', { count: opt.size }) : t('cardCount', { count: opt.size })}
            </span>
            {opt.recommended ? (
              <Typography
                component="span"
                sx={{
                  px: 1,
                  py: 0.25,
                  borderRadius: 2,
                  border: '1px solid rgba(255,255,255,0.5)',
                  color: '#fff',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                }}
              >
                {t(opt.descKey)}
              </Typography>
            ) : (
              <Chip
                label={t(opt.descKey)}
                size="small"
                variant="outlined"
                sx={{
                  pointerEvents: 'none',
                  borderColor: alpha(brand[300], 0.3),
                  color: 'text.secondary',
                  fontSize: '0.75rem',
                }}
              />
            )}
          </Button>
        ))}
      </Stack>

      {footer}

      <Typography
        variant="caption"
        sx={{ display: 'block', mt: 2.5, maxWidth: 300, mx: 'auto', color: 'text.secondary' }}
      >
        {t('footerHint')}
      </Typography>
    </Box>
  );
}
