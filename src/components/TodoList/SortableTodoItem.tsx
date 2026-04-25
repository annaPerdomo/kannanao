'use client';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DragIndicatorRoundedIcon from '@mui/icons-material/DragIndicatorRounded';
import Box from '@mui/material/Box';
import { alpha } from '@mui/material/styles';

import type { Todo } from '@/types/todo';

import { TodoItem } from './TodoItem';

interface SortableTodoItemProps {
  todo: Todo;
  viewDateISO: string;
  onToggle: (id: string, date: string) => Promise<boolean>;
  onEditEmoji: (id: string, emoji: string) => void;
  onDelete: (id: string) => void;
  onAdvancedEdit: (todo: Todo) => void;
  onXpEarned?: (xp: number) => void;
  brand: Record<number, string>;
}

export function SortableTodoItem({
  todo,
  viewDateISO,
  onToggle,
  onEditEmoji,
  onDelete,
  onAdvancedEdit,
  onXpEarned,
  brand,
}: SortableTodoItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: todo.id,
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
        color: alpha(brand[300], 0.6),
        transition: 'color 0.15s',
        ml: -0.5,
        mr: -0.25,
        '&:hover': { color: brand[500] },
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
      <TodoItem
        todo={todo}
        viewDateISO={viewDateISO}
        onToggle={onToggle}
        onEditEmoji={onEditEmoji}
        onDelete={onDelete}
        onAdvancedEdit={onAdvancedEdit}
        onXpEarned={onXpEarned}
        dragHandle={dragHandle}
      />
    </Box>
  );
}
