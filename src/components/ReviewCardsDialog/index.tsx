'use client';

import { useState, useCallback } from 'react';
import {
  Dialog, DialogContent, Box, Typography, IconButton, Button,
  ToggleButtonGroup, ToggleButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckIcon from '@mui/icons-material/Check';
import { CardRow, type PendingCard } from './CardRow';
import { compactToggleSx } from './styles';

interface ReviewCardsDialogProps {
  open: boolean;
  cards: PendingCard[];
  onConfirm: (cards: PendingCard[]) => void;
  onClose: () => void;
}

export function ReviewCardsDialog({ open, cards: initialCards, onConfirm, onClose }: ReviewCardsDialogProps) {
  const [cards, setCards] = useState<PendingCard[]>(initialCards);
  const [originalExamples, setOriginalExamples] = useState<string[]>(() => initialCards.map((c) => c.example_jp));
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const [prevInitial, setPrevInitial] = useState(initialCards);
  if (initialCards !== prevInitial) {
    setPrevInitial(initialCards);
    setCards(initialCards);
    setOriginalExamples(initialCards.map((c) => c.example_jp));
  }

  const handleUpdate = useCallback((index: number, patch: Partial<PendingCard>) => {
    setCards((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }, []);

  const handleDelete = useCallback((index: number) => {
    setCards((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSetAllViewMode = useCallback((mode: 'hiragana' | 'kanji') => {
    setCards((prev) => prev.map((c) => ({ ...c, mainViewMode: mode })));
  }, []);

  const handleToggleExpand = useCallback((index: number) => {
    setExpandedIndex((prev) => (prev === index ? null : index));
  }, []);

  const handleConfirm = () => {
    if (cards.length === 0) return;
    onConfirm(cards);
  };

  const allViewMode = cards.length > 0 && cards.every((c) => c.mainViewMode === cards[0].mainViewMode)
    ? cards[0].mainViewMode
    : null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            bgcolor: '#FFFBFE',
            backgroundImage: 'none',
            border: '1.5px solid rgba(249,168,212,0.4)',
            boxShadow: '0 20px 60px rgba(236,72,153,0.14), 0 4px 16px rgba(249,168,212,0.2)',
            borderRadius: '20px',
            overflow: 'hidden',
            maxHeight: '85vh',
          },
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #FFF0F8 0%, #F3E8FF 100%)',
          borderBottom: '1.5px solid rgba(249,168,212,0.25)',
          px: 3, pt: 2.5, pb: 2, position: 'relative',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
          <Box>
            <Typography sx={{ fontSize: '1.15rem', fontWeight: 900, color: '#9D174D', fontFamily: '"Nunito", sans-serif', lineHeight: 1.2, mb: 0.4 }}>
              📋 Review Cards
            </Typography>
            <Typography sx={{ fontSize: '0.75rem', color: '#C2709A', fontFamily: '"Nunito", sans-serif', fontWeight: 600 }}>
              {cards.length} card{cards.length !== 1 ? 's' : ''} generated — edit before adding
            </Typography>
          </Box>
          <IconButton
            size="small" onClick={onClose}
            sx={{ width: 28, height: 28, color: 'rgba(190,24,93,0.4)', '&:hover': { bgcolor: 'rgba(249,168,212,0.2)', color: '#BE185D' } }}
          >
            <CloseIcon sx={{ fontSize: 15 }} />
          </IconButton>
        </Box>

        {/* Global controls bar */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5, bgcolor: 'rgba(255,255,255,0.6)', border: '1px solid rgba(249,168,212,0.25)', borderRadius: '10px', px: 1.5, py: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, color: '#C2709A', fontFamily: '"Nunito", sans-serif', whiteSpace: 'nowrap' }}>
              Set main view mode for all cards:
            </Typography>
            <ToggleButtonGroup value={allViewMode} exclusive size="small" onChange={(_, v) => { if (v) handleSetAllViewMode(v); }} sx={compactToggleSx}>
              <ToggleButton value="hiragana">ひ Hiragana</ToggleButton>
              <ToggleButton value="kanji">漢 Kanji</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Box>
      </Box>

      {/* Card list */}
      <DialogContent sx={{ px: 2, pt: 2, pb: 0, display: 'flex', flexDirection: 'column', gap: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {cards.length === 0 && (
          <Typography sx={{ textAlign: 'center', color: '#C2709A', fontFamily: '"Nunito", sans-serif', fontSize: '0.85rem', py: 4 }}>
            All cards have been removed.
          </Typography>
        )}
        {cards.map((card, i) => (
          <CardRow
            key={`${card.word}-${card.reading}-${i}`}
            card={card}
            originalExampleJp={originalExamples[i] ?? ''}
            index={i}
            expanded={expandedIndex === i}
            onToggleExpand={handleToggleExpand}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />
        ))}
      </DialogContent>

      {/* Footer */}
      <Box sx={{ px: 2.5, py: 2, borderTop: '1.5px solid rgba(249,168,212,0.2)', display: 'flex', gap: 1.5, justifyContent: 'flex-end', background: 'linear-gradient(0deg, #FFFBFE 0%, transparent 100%)' }}>
        <Button
          variant="outlined" onClick={onClose}
          sx={{ borderRadius: '10px', fontFamily: '"Nunito", sans-serif', fontWeight: 700, fontSize: '0.82rem', textTransform: 'none', borderColor: 'rgba(249,168,212,0.5)', color: '#BE185D', '&:hover': { borderColor: '#F472B6', bgcolor: 'rgba(249,168,212,0.06)' } }}
        >
          Cancel
        </Button>
        <Button
          variant="contained" disabled={cards.length === 0} onClick={handleConfirm}
          startIcon={<CheckIcon sx={{ fontSize: 16 }} />}
          sx={{
            borderRadius: '10px', fontFamily: '"Nunito", sans-serif', fontWeight: 800, fontSize: '0.82rem', textTransform: 'none',
            background: cards.length > 0 ? 'linear-gradient(135deg, #F472B6 0%, #EC4899 50%, #A855F7 100%)' : undefined,
            boxShadow: cards.length > 0 ? '0 4px 14px rgba(236,72,153,0.35)' : undefined,
            '&:hover': { boxShadow: '0 6px 20px rgba(236,72,153,0.45)' },
          }}
        >
          Add {cards.length} Card{cards.length !== 1 ? 's' : ''} to Deck
        </Button>
      </Box>
    </Dialog>
  );
}
