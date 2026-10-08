'use client';

import type { DragEndEvent } from '@dnd-kit/core';
import {
  closestCenter,
  DndContext,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove, rectSortingStrategy, SortableContext } from '@dnd-kit/sortable';
import Grid from '@mui/material/Grid';
import { useCallback } from 'react';

import { DeckCard } from '@/components/DeckCard';
import { SortableDeckCard } from '@/components/SortableDeckCard';
import type { Deck } from '@/types/deck';

interface DeckGridProps {
  decks: Deck[];
  reordering: boolean;
  onReorder: (decks: Deck[]) => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onShare: (id: string) => void;
  onPin: (id: string, pinned: boolean) => void;
  onEmojiChange: (id: string, emoji: string | null) => void;
  onAddToGroup?: (id: string) => void;
  isOwner: (deck: Deck) => boolean;
}

export function DeckGrid({
  decks,
  reordering,
  onReorder,
  onOpen,
  onDelete,
  onShare,
  onPin,
  onEmojiChange,
  onAddToGroup,
  isOwner,
}: DeckGridProps) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = decks.findIndex((d) => d.id === active.id);
      const newIndex = decks.findIndex((d) => d.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      onReorder(arrayMove(decks, oldIndex, newIndex));
    },
    [decks, onReorder],
  );

  if (!reordering) {
    return (
      <Grid container spacing={2}>
        {decks.map((deck) => {
          const owned = isOwner(deck);
          return (
            <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2.4 }} key={deck.id}>
              <DeckCard
                deck={deck}
                onOpen={onOpen}
                onDelete={owned ? onDelete : () => {}}
                onShare={owned ? onShare : undefined}
                onPin={onPin}
                onEmojiChange={owned ? onEmojiChange : undefined}
                onAddToGroup={owned && onAddToGroup ? onAddToGroup : undefined}
                isOwner={owned}
              />
            </Grid>
          );
        })}
      </Grid>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={decks.map((d) => d.id)} strategy={rectSortingStrategy}>
        <Grid container spacing={2}>
          {decks.map((deck) => {
            const owned = isOwner(deck);
            return (
              <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2.4 }} key={deck.id}>
                <SortableDeckCard
                  deck={deck}
                  onDelete={owned ? onDelete : () => {}}
                  onShare={owned ? onShare : undefined}
                  onPin={onPin}
                  onEmojiChange={owned ? onEmojiChange : undefined}
                  isOwner={owned}
                />
              </Grid>
            );
          })}
        </Grid>
      </SortableContext>
    </DndContext>
  );
}
