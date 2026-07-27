'use client';

import ButtonBase from '@mui/material/ButtonBase';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

interface DashedAddRowProps {
  label: string;
  onClick: () => void;
  /**
   * Stand in for a card: fill the cell and take a card's corners. Set when the
   * row sits *inside* a grid of tiles rather than under a list, so the empty
   * slot reads as one more card in the hand.
   */
  cardSlot?: boolean;
  /**
   * Floor height for a card slot. Needed only when no sibling tile is there to
   * set the grid row's height — i.e. when nothing is pinned yet.
   */
  minHeight?: number;
}

/**
 * The "make another one" row that closes every list on the dashboard — groups,
 * decks, speeches. Shared across all three so the affordance stays consistent.
 */
export function DashedAddRow({ label, onClick, cardSlot = false, minHeight }: DashedAddRowProps) {
  return (
    <ButtonBase
      onClick={onClick}
      focusRipple
      sx={{
        width: '100%',
        ...(cardSlot && { height: '100%', minHeight }),
        justifyContent: 'center',
        p: 1.5,
        borderRadius: (t) => (cardSlot ? t.radii.card : t.radii.lg),
        border: (t) => `2px dashed ${alpha(t.palette.brand[300], 0.55)}`,
        bgcolor: (t) => alpha(t.palette.brand[50], 0.55),
        transition: 'border-color 0.12s ease, background-color 0.12s ease',
        '&:hover': {
          borderColor: (t) => t.palette.brand[400],
          bgcolor: (t) => alpha(t.palette.brand[100], 0.5),
        },
      }}
    >
      {/* Typography overrides the letter-spacing/weight ButtonBase applies via theme.typography.button. */}
      <Typography
        sx={{
          fontSize: '0.95rem',
          fontWeight: 800,
          lineHeight: 1.2,
          textTransform: 'none',
          textAlign: 'center',
          color: (t) => t.palette.brand[700],
        }}
      >
        ＋ {label}
      </Typography>
    </ButtonBase>
  );
}
