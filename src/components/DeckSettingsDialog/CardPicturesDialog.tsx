'use client';
import CheckIcon from '@mui/icons-material/Check';
import ImageNotSupportedIcon from '@mui/icons-material/ImageNotSupported';
import ImageSearchIcon from '@mui/icons-material/ImageSearch';
import { Box, Button, ButtonBase, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';

import { LoadingOverlay } from '@/components/Loading';
import { StyledDialog } from '@/components/StyledDialog';
import { UnsplashAttribution } from '@/components/UnsplashAttribution';
import type { FillImagesResult } from '@/hooks/useDeckImages';
import type { Flashcard } from '@/types/flashcard';

import { PictureRunFeedback } from './PictureRunFeedback';

interface CardPicturesDialogProps {
  open: boolean;
  onClose: () => void;
  cards: Flashcard[];
  selectedIds: Set<string>;
  selectedCount: number;
  filling: boolean;
  result: FillImagesResult | null;
  error: string | null;
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onSelectNone: () => void;
  onFill: () => void;
}

function PictureTile({
  card,
  checked,
  disabled,
  onToggle,
}: {
  card: Flashcard;
  checked: boolean;
  disabled: boolean;
  onToggle: (id: string) => void;
}) {
  const { brand } = useTheme().palette;

  const tile = (
    <ButtonBase
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onToggle(card.id)}
      sx={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        borderRadius: 2.5,
        overflow: 'hidden',
        bgcolor: 'background.paper',
        border: `2.5px solid ${checked ? brand[500] : alpha(brand[300], 0.5)}`,
        boxShadow: checked ? `0 4px 14px ${alpha(brand[500], 0.28)}` : 'none',
        '&.Mui-disabled': { opacity: 0.5 },
      }}
    >
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          aspectRatio: '4 / 3',
          bgcolor: alpha(brand[200], 0.5),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {card.imageUrl ? (
          <Box
            component="img"
            src={card.imageUrl}
            alt=""
            loading="lazy"
            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <ImageNotSupportedIcon sx={{ fontSize: 30, color: brand[500] }} aria-hidden />
        )}

        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            top: 6,
            right: 6,
            width: 24,
            height: 24,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: checked ? brand[500] : alpha('#fff', 0.85),
            border: `2px solid ${checked ? brand[500] : alpha(brand[500], 0.5)}`,
            color: '#fff',
          }}
        >
          {checked && <CheckIcon sx={{ fontSize: 15 }} />}
        </Box>
      </Box>

      <Box sx={{ px: 1, py: 0.75 }}>
        <Typography noWrap sx={{ fontWeight: 800, fontSize: '0.85rem', color: 'text.primary' }}>
          {card.word}
        </Typography>
        <Typography noWrap sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
          {card.meaning}
        </Typography>
      </Box>
    </ButtonBase>
  );

  // Outside the tile because an anchor nested in a <button> isn't clickable,
  // and dropped entirely while filling so the links stay out of
  // LoadingOverlay's aria-hidden subtree.
  return (
    <Box>
      {tile}
      {!disabled && card.imageUrl && (
        <Box sx={{ px: 0.5, pt: 0.5 }}>
          <UnsplashAttribution url={card.imageUrl} variant="caption" />
        </Box>
      )}
    </Box>
  );
}

/** Its own dialog, not a row in settings: a 44px thumbnail can't answer "is
 * this picture any good?" */
export function CardPicturesDialog({
  open,
  onClose,
  cards,
  selectedIds,
  selectedCount,
  filling,
  result,
  error,
  onToggle,
  onSelectAll,
  onSelectNone,
  onFill,
}: CardPicturesDialogProps) {
  const t = useTranslations('Deck.settingsDialog');
  const { brand } = useTheme().palette;
  const replacingCount = cards.filter((c) => selectedIds.has(c.id) && c.imageUrl).length;

  const grid = (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: 1.5,
      }}
    >
      {cards.map((card) => (
        <PictureTile
          key={card.id}
          card={card}
          checked={selectedIds.has(card.id)}
          disabled={filling}
          onToggle={onToggle}
        />
      ))}
    </Box>
  );

  const bulkButtonSx = {
    minWidth: 0,
    p: 0,
    fontSize: '0.75rem',
    fontWeight: 700,
    textTransform: 'none',
    color: brand[700],
  } as const;

  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      title={t('imagesDialogTitle')}
      subtitle={t('imagesPickLabel')}
      icon={<ImageSearchIcon sx={{ color: brand[600], fontSize: 20 }} />}
      maxWidth="sm"
      titleId="card-pictures-dialog-title"
      actions={
        <Button
          variant="contained"
          fullWidth
          onClick={onFill}
          disabled={filling || selectedCount === 0}
          startIcon={<ImageSearchIcon sx={{ fontSize: 17 }} />}
          sx={{ borderRadius: '10px', py: 1, fontWeight: 800, textTransform: 'none' }}
        >
          {filling ? t('imagesWorking') : t('imagesFindButton', { count: selectedCount })}
        </Button>
      }
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
        <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: 'text.secondary', flex: 1 }}>
          {t('imagesSelectedCount', { count: selectedCount })}
        </Typography>
        <Button size="small" disabled={filling} onClick={onSelectAll} sx={bulkButtonSx}>
          {t('imagesSelectAll')}
        </Button>
        <Button size="small" disabled={filling} onClick={onSelectNone} sx={bulkButtonSx}>
          {t('imagesSelectNone')}
        </Button>
      </Box>

      {/* Tango waits over the grid: the run takes seconds per picture, and the
          cards behind him are what's being changed. */}
      {filling ? <LoadingOverlay message={t('imagesWorking')}>{grid}</LoadingOverlay> : grid}

      {replacingCount > 0 && !filling && (
        <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', mt: 1.5 }}>
          {t('imagesReplaceNote', { count: replacingCount })}
        </Typography>
      )}

      {selectedCount > 0 && !filling && (
        <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', mt: 1 }}>
          {t('imagesHourlyHint')}
        </Typography>
      )}

      <PictureRunFeedback filling={filling} result={result} error={error} />
    </StyledDialog>
  );
}
