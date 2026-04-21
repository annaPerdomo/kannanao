'use client';

import { useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ToggleButton from '@mui/material/ToggleButton';
import { useTheme, alpha } from '@mui/material/styles';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { CARD_BORDER_STYLES } from '@/hooks/useShop';
import { CardBorderCtx } from '@/contexts/CardBorderContext';
import { ImageCard } from '@/components/ImageCard';
import { Flashcard } from '@/components/Flashcard';
import { SAMPLE_CARD } from './constants';

export function BorderPreviewModal({
  open,
  onClose,
  borderKey,
  borderName,
}: {
  open: boolean;
  onClose: () => void;
  borderKey: string;
  borderName: string;
}) {
  const theme = useTheme();
  const { brand } = theme.palette;
  const [cardView, setCardView] = useState<'collection' | 'study'>('study');

  const borderStyle = CARD_BORDER_STYLES[borderKey] ?? {};

  const mockBorderCtx = useMemo(
    () => ({ borderStyle, equippedBorderKey: borderKey }),
    [borderStyle, borderKey],
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 4,
            border: `2px solid ${alpha(brand[300], 0.35)}`,
            boxShadow: `0 12px 48px ${alpha(brand[700], 0.15)}`,
            bgcolor: theme.palette.surfaces.overlay,
            overflow: 'visible',
            position: 'relative',
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          fontFamily: (t) => t.fonts.cute,
          color: brand[700],
          textAlign: 'center',
          pb: 0.5,
          fontSize: '1.15rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
        }}
      >
        <VisibilityIcon sx={{ fontSize: '1.1rem', color: brand[400] }} />
        Preview: {borderName}
      </DialogTitle>

      <Box sx={{ display: 'flex', justifyContent: 'center', pb: 1.5 }}>
        <ToggleButtonGroup
          value={cardView}
          exclusive
          onChange={(_, v) => { if (v) setCardView(v); }}
          size="small"
          sx={{
            '& .MuiToggleButton-root': {
              fontFamily: (t) => t.fonts.cute,
              fontSize: '0.75rem',
              px: 2,
              py: 0.4,
              textTransform: 'none',
              borderColor: alpha(brand[300], 0.4),
              color: brand[600],
              '&.Mui-selected': {
                bgcolor: alpha(brand[400], 0.15),
                color: brand[700],
                borderColor: brand[400],
                fontWeight: 700,
              },
            },
          }}
        >
          <ToggleButton value="study">Study Card</ToggleButton>
          <ToggleButton value="collection">Collection Card</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <DialogContent sx={{ display: 'flex', justifyContent: 'center', pt: 0, pb: 3, px: { xs: 2, sm: 3 } }}>
        <CardBorderCtx.Provider value={mockBorderCtx}>
          {cardView === 'study' ? (
            <Box sx={{ width: 280, height: 420 }}>
              <Flashcard card={SAMPLE_CARD} width={280} height={420} />
            </Box>
          ) : (
            <Box sx={{ width: 240 }}>
              <ImageCard
                card={SAMPLE_CARD}
                onDelete={() => {}}
              />
            </Box>
          )}
        </CardBorderCtx.Provider>
      </DialogContent>

      <DialogActions sx={{ justifyContent: 'center', pb: 2.5 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{ borderRadius: 2, px: 4, fontFamily: (t) => t.fonts.cute }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
