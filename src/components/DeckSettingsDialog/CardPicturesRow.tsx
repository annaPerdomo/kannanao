'use client';
import ImageSearchIcon from '@mui/icons-material/ImageSearch';
import { Box, Button, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import type { FillImagesResult } from '@/hooks/useDeckImages';
import type { Flashcard } from '@/types/flashcard';

import { CardPicturesDialog } from './CardPicturesDialog';
import { PictureRunFeedback } from './PictureRunFeedback';

interface CardPicturesRowProps {
  /** Deck cards Unsplash can be searched for, in deck order. */
  cards: Flashcard[];
  selectedIds: Set<string>;
  selectedCount: number;
  missingCount: number;
  filling: boolean;
  result: FillImagesResult | null;
  error: string | null;
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onSelectNone: () => void;
  onFill: () => void;
}

/**
 * Says how the deck's pictures stand and opens the picker. Unsplash's free
 * hourly allowance is what leaves cards bare mid-generation, and is why the
 * fill is a picker at all — it has to be spent on chosen cards.
 */
export function CardPicturesRow({
  cards,
  selectedIds,
  selectedCount,
  missingCount,
  filling,
  result,
  error,
  onToggle,
  onSelectAll,
  onSelectNone,
  onFill,
}: CardPicturesRowProps) {
  const t = useTranslations('Deck.settingsDialog');
  const { brand } = useTheme().palette;
  const [pickerOpen, setPickerOpen] = useState(false);
  const empty = cards.length === 0;

  const status = empty
    ? t('imagesEmpty')
    : filling
      ? t('imagesWorking')
      : missingCount === 0
        ? t('imagesAllHavePictures')
        : t('imagesMissing', { count: missingCount });

  return (
    <Box
      sx={{
        p: 2,
        mt: 1.5,
        borderRadius: 3,
        bgcolor: alpha(brand[100], 0.6),
        border: `1.5px solid ${alpha(brand[300], 0.5)}`,
        opacity: empty ? 0.65 : 1,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
        <ImageSearchIcon sx={{ color: brand[500], fontSize: 22 }} aria-hidden />
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: 'text.primary' }}>
            {t('imagesTitle')}
          </Typography>
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 0.25 }}>
            {status}
          </Typography>
        </Box>
      </Box>

      <Button
        variant="contained"
        fullWidth
        onClick={() => setPickerOpen(true)}
        disabled={empty}
        startIcon={<ImageSearchIcon sx={{ fontSize: 17 }} />}
        sx={{
          borderRadius: '10px',
          py: 0.75,
          fontWeight: 800,
          fontSize: '0.8rem',
          textTransform: 'none',
        }}
      >
        {t('imagesChooseButton')}
      </Button>

      {/* While the picker is open it reports the run itself. */}
      {!pickerOpen && <PictureRunFeedback filling={filling} result={result} error={error} />}

      <CardPicturesDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        cards={cards}
        selectedIds={selectedIds}
        selectedCount={selectedCount}
        filling={filling}
        result={result}
        error={error}
        onToggle={onToggle}
        onSelectAll={onSelectAll}
        onSelectNone={onSelectNone}
        onFill={onFill}
      />
    </Box>
  );
}
