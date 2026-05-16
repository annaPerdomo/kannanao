'use client';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DragIndicatorRoundedIcon from '@mui/icons-material/DragIndicatorRounded';
import Box from '@mui/material/Box';
import { alpha } from '@mui/material/styles';
import { memo } from 'react';

import { SpeechLineRow } from './SpeechLineRow';

interface SortableSpeechLineRowProps {
  lineId: string;
  text: string;
  index: number;
  editingId: string | null;
  editVal: string;
  brandPalette: Record<number, string>;
  onStartEdit: (id: string, text: string) => void;
  onEditValChange: (val: string) => void;
  onCommitEdit: () => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
}

export const SortableSpeechLineRow = memo(function SortableSpeechLineRow(
  props: SortableSpeechLineRowProps,
) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.lineId,
  });

  const dragHandle = (
    <Box
      {...listeners}
      {...attributes}
      sx={{
        display: 'flex',
        alignItems: 'center',
        cursor: 'grab',
        flexShrink: 0,
        color: alpha(props.brandPalette[300], 0.6),
        transition: 'color 0.15s',
        '&:hover': { color: props.brandPalette[500] },
        '&:active': { cursor: 'grabbing' },
        touchAction: 'none',
      }}
    >
      <DragIndicatorRoundedIcon sx={{ fontSize: '1rem' }} />
    </Box>
  );

  return (
    <Box
      ref={setNodeRef}
      sx={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 999 : undefined,
      }}
    >
      <SpeechLineRow {...props} dragHandle={dragHandle} />
    </Box>
  );
});
