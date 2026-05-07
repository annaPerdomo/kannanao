'use client';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DragIndicatorRoundedIcon from '@mui/icons-material/DragIndicatorRounded';
import Box from '@mui/material/Box';
import { memo } from 'react';

import type { Flashcard } from '@/types/flashcard';

import { ImageCard } from './ImageCard';

interface SortableImageCardProps {
  card: Flashcard;
  onDelete: (id: string) => void;
  onUpdate?: (id: string, patch: Partial<Flashcard>) => Promise<Flashcard | null>;
}

export const SortableImageCard = memo(function SortableImageCard({
  card,
  ...props
}: SortableImageCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
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
      }}
    >
      {/* Reorder badge on the top bar */}
      <Box
        sx={{
          position: 'absolute',
          top: 7,
          left: 10,
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          color: 'rgba(255,255,255,0.9)',
          pointerEvents: 'none',
        }}
      >
        <DragIndicatorRoundedIcon sx={{ fontSize: '0.85rem' }} />
      </Box>
      <ImageCard card={card} readOnly {...props} />
    </Box>
  );
});
