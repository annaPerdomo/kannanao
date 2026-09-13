'use client';

import CheckIcon from '@mui/icons-material/Check';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import { alpha, useTheme } from '@mui/material/styles';

interface DialogFooterProps {
  cardCount: number;
  saving: boolean;
  regenerating: boolean;
  confirmLabel?: string;
  onClose: () => void;
  onConfirm: () => void;
}

export function DialogFooter({
  cardCount,
  saving,
  regenerating,
  confirmLabel,
  onClose,
  onConfirm,
}: DialogFooterProps) {
  const { brand, accent } = useTheme().palette;

  return (
    <Box
      sx={{
        px: 2.5,
        py: 2,
        borderTop: `1.5px solid ${alpha(brand[300], 0.2)}`,
        display: 'flex',
        gap: 1.5,
        justifyContent: 'flex-end',
        background: `linear-gradient(0deg, ${brand[50]} 0%, transparent 100%)`,
      }}
    >
      <Button
        variant="outlined"
        disabled={saving}
        onClick={onClose}
        sx={{
          borderRadius: '10px',
          fontWeight: 700,
          fontSize: '0.82rem',
          textTransform: 'none',
          borderColor: alpha(brand[300], 0.5),
          color: brand[700],
          '&:hover': { borderColor: brand[400], bgcolor: alpha(brand[300], 0.06) },
        }}
      >
        Cancel
      </Button>
      <Button
        variant="contained"
        disabled={cardCount === 0 || regenerating || saving}
        onClick={onConfirm}
        startIcon={
          saving ? (
            <CircularProgress size={14} color="inherit" />
          ) : (
            <CheckIcon sx={{ fontSize: 16 }} />
          )
        }
        sx={{
          borderRadius: '10px',
          fontWeight: 800,
          fontSize: '0.82rem',
          textTransform: 'none',
          background:
            cardCount > 0
              ? `linear-gradient(135deg, ${brand[400]} 0%, ${brand[500]} 50%, ${accent[500]} 100%)`
              : undefined,
          boxShadow: cardCount > 0 ? `0 4px 14px ${alpha(brand[500], 0.35)}` : undefined,
          '&:hover': { boxShadow: `0 6px 20px ${alpha(brand[500], 0.45)}` },
        }}
      >
        {confirmLabel ?? `Add ${cardCount} Card${cardCount !== 1 ? 's' : ''} to Deck`}
      </Button>
    </Box>
  );
}
