'use client';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { memo, type ReactNode } from 'react';

import FuriganaText from '@/components/FuriganaText';
import type { Flashcard } from '@/types/flashcard';

import { FillWithAiButton } from './FillWithAiButton';

interface WordItemProps {
  card: Flashcard;
  insight?: ReactNode;
  disabled?: boolean;
  onEdit: (card: Flashcard) => void;
  onRemove: (card: Flashcard) => void;
  onFilled: (card: Flashcard) => void;
  onFillError: (message: string) => void;
}

export const WordItem = memo(function WordItem({
  card,
  insight,
  disabled,
  onEdit,
  onRemove,
  onFilled,
  onFillError,
}: WordItemProps) {
  const t = useTranslations('Materials.handoutPage');
  const theme = useTheme();
  const missingField = !card.reading.trim() || !card.meaning.trim() || !card.example_jp.trim();

  return (
    <Stack direction="row" sx={{ py: 1.25, gap: 1.5, alignItems: 'flex-start' }}>
      {card.imageUrl && (
        <Box
          component="img"
          src={card.imageUrl}
          alt=""
          loading="lazy"
          sx={{
            width: 48,
            height: 48,
            borderRadius: theme.radii.sm,
            objectFit: 'cover',
            flexShrink: 0,
          }}
        />
      )}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" sx={{ alignItems: 'baseline', gap: 1, flexWrap: 'wrap' }}>
          <Typography
            lang="ja"
            sx={{ fontWeight: 700, fontSize: '1.05rem', color: 'text.primary' }}
          >
            {card.word}
          </Typography>
          {card.reading && card.reading !== card.word && (
            <Typography lang="ja" sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
              {card.reading}
            </Typography>
          )}
        </Stack>
        <Typography sx={{ fontSize: '0.875rem', color: 'text.primary' }}>{card.meaning}</Typography>
        {card.example_jp && (
          <Typography
            component="div"
            lang="ja"
            sx={{ fontSize: '0.85rem', color: 'text.secondary', mt: 0.5, lineHeight: 1.8 }}
          >
            <FuriganaText text={card.example_jp} showFurigana />
          </Typography>
        )}
        {card.example_en && (
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
            {card.example_en}
          </Typography>
        )}
        {insight && (
          <Stack direction="row" sx={{ gap: 0.5, flexWrap: 'wrap', mt: 0.75 }}>
            {insight}
          </Stack>
        )}
      </Box>
      <Stack direction="row" sx={{ flexShrink: 0 }}>
        {missingField && (
          <FillWithAiButton
            card={card}
            disabled={disabled}
            onFilled={onFilled}
            onError={onFillError}
          />
        )}
        <IconButton
          size="small"
          aria-label={t('editWord', { word: card.word })}
          onClick={() => onEdit(card)}
          disabled={disabled}
        >
          <EditIcon sx={{ fontSize: 18 }} />
        </IconButton>
        <IconButton
          size="small"
          aria-label={t('removeWord', { word: card.word })}
          onClick={() => onRemove(card)}
          disabled={disabled}
        >
          <DeleteOutlineIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Stack>
    </Stack>
  );
});
