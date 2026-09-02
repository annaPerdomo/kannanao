'use client';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import FuriganaText from '@/components/FuriganaText';
import { SpeakButton } from '@/components/SpeakButton';
import { StyledDialog } from '@/components/StyledDialog';
import TitleFurigana from '@/components/TitleFurigana';
import type { BinderCard } from '@/lib/binder';
import { furiganaFromReading } from '@/lib/furigana';

interface CardDetailDialogProps {
  entry: BinderCard | null;
  onClose: () => void;
}

export function CardDetailDialog({ entry, onClose }: CardDetailDialogProps) {
  const t = useTranslations('Binder.detail');
  const tStrength = useTranslations('Binder.filters.strength');
  const { brand, accent } = useTheme().palette;
  const card = entry?.card;
  const markup = card ? (furiganaFromReading(card.word, card.reading) ?? card.word) : '';
  const answered = entry?.progress ? entry.progress.correctCount + entry.progress.wrongCount : 0;

  return (
    <StyledDialog
      open={entry !== null}
      onClose={onClose}
      title={card ? <TitleFurigana markup={markup} /> : ''}
      subtitle={card?.meaning}
      icon={entry?.strength === 'strong' ? '⭐' : '🎴'}
      maxWidth="xs"
      titleId="binder-card-title"
    >
      {card && entry && (
        <Stack spacing={2}>
          {card.imageUrl && (
            <Box
              component="img"
              src={card.imageUrl}
              alt=""
              loading="lazy"
              sx={{ width: '100%', borderRadius: 3, aspectRatio: '4 / 3', objectFit: 'cover' }}
            />
          )}
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Typography sx={{ fontSize: '1.1rem', color: 'text.secondary' }}>
              {card.reading}
            </Typography>
            <SpeakButton text={card.reading} />
            <Chip
              size="small"
              label={tStrength(entry.strength)}
              sx={{ fontWeight: 700, bgcolor: alpha(accent[100], 0.7) }}
            />
            {card.jlptLevel && <Chip size="small" label={card.jlptLevel} variant="outlined" />}
          </Stack>
          {card.example_jp && (
            <Box
              sx={{
                p: 1.5,
                borderRadius: 3,
                bgcolor: alpha(brand[50], 0.8),
                border: `1px solid ${alpha(brand[300], 0.4)}`,
              }}
            >
              <Stack direction="row" spacing={1} alignItems="flex-start">
                <FuriganaText
                  text={card.example_jp}
                  showFurigana
                  sx={{ fontSize: '1.05rem', color: 'text.primary', flexGrow: 1 }}
                />
                <SpeakButton text={card.example_jp} />
              </Stack>
              {card.example_en && (
                <Typography sx={{ mt: 0.75, fontSize: '0.9rem', color: 'text.secondary' }}>
                  {card.example_en}
                </Typography>
              )}
            </Box>
          )}
          <Typography variant="body2" color="text.secondary">
            {answered > 0
              ? t('record', { correct: entry.progress?.correctCount ?? 0, total: answered })
              : t('noRecord')}
          </Typography>
        </Stack>
      )}
    </StyledDialog>
  );
}
