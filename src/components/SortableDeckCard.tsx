'use client';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DragIndicatorRoundedIcon from '@mui/icons-material/DragIndicatorRounded';
import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';
import { memo } from 'react';

import type { Deck } from '@/types/deck';

import { DeckCard } from './DeckCard';

interface SortableDeckCardProps {
  deck: Deck;
  onDelete: (id: string) => void;
  onShare?: (id: string) => void;
  onPin?: (id: string, pinned: boolean) => void;
  onEmojiChange?: (id: string, emoji: string | null) => void;
  isOwner?: boolean;
}

export const SortableDeckCard = memo(function SortableDeckCard({
  deck,
  ...props
}: SortableDeckCardProps) {
  const theme = useTheme();
  const { brand } = theme.palette;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: deck.id,
  });

  return (
    <Box
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      sx={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 999 : undefined,
        cursor: isDragging ? 'grabbing' : 'grab',
        touchAction: 'none',
        position: 'relative',
        '& .reorder-badge': { opacity: 1 },
      }}
    >
      {/* Reorder badge on the top bar */}
      <Box
        className="reorder-badge"
        sx={{
          position: 'absolute',
          top: 7,
          left: 10,
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 0.3,
          color: 'rgba(255,255,255,0.9)',
          pointerEvents: 'none',
        }}
      >
        <DragIndicatorRoundedIcon sx={{ fontSize: '0.85rem' }} />
      </Box>
      <DeckCard deck={deck} onOpen={() => {}} {...props} />
    </Box>
  );
});
