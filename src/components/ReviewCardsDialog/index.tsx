'use client';

import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useCallback, useState } from 'react';

import type { MainViewMode } from '@/types/flashcard';

import { CardRow, type PendingCard } from './CardRow';
import { compactToggleSx } from './styles';

interface ReviewCardsDialogProps {
  open: boolean;
  cards: PendingCard[];
  onConfirm: (cards: PendingCard[]) => void;
  onClose: () => void;
}

export function ReviewCardsDialog({
  open,
  cards: initialCards,
  onConfirm,
  onClose,
}: ReviewCardsDialogProps) {
  const theme = useTheme();
  const { brand, accent } = theme.palette;
  const [cards, setCards] = useState<PendingCard[]>(initialCards);
  const [originalExamples, setOriginalExamples] = useState<string[]>(() =>
    initialCards.map((c) => c.example_jp),
  );
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

  const handleSetAllViewMode = useCallback((mode: MainViewMode) => {
    setCards((prev) => prev.map((c) => ({ ...c, mainViewMode: mode })));
  }, []);

  const handleToggleExpand = useCallback((index: number) => {
    setExpandedIndex((prev) => (prev === index ? null : index));
  }, []);

  const handleConfirm = () => {
    if (cards.length === 0) return;
    onConfirm(cards);
  };

  const allViewMode =
    cards.length > 0 && cards.every((c) => c.mainViewMode === cards[0].mainViewMode)
      ? cards[0].mainViewMode
      : null;

  const toggleSx = compactToggleSx(theme);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            bgcolor: brand[50],
            backgroundImage: 'none',
            border: `1.5px solid ${alpha(brand[300], 0.4)}`,
            boxShadow: `0 20px 60px ${alpha(brand[500], 0.14)}, 0 4px 16px ${alpha(brand[300], 0.2)}`,
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
          background: `linear-gradient(135deg, ${alpha(brand[100], 0.5)} 0%, ${alpha(accent[100], 0.5)} 100%)`,
          borderBottom: `1.5px solid ${alpha(brand[300], 0.25)}`,
          px: 3,
          pt: 2.5,
          pb: 2,
          position: 'relative',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            mb: 1.5,
          }}
        >
          <Box>
            <Typography
              sx={{
                fontSize: '1.15rem',
                fontWeight: 900,
                color: brand[800],
                lineHeight: 1.2,
                mb: 0.4,
              }}
            >
              📋 Review Cards
            </Typography>
            <Typography
              sx={{ fontSize: '0.75rem', color: alpha(brand[700], 0.6), fontWeight: 600 }}
            >
              {cards.length} card{cards.length !== 1 ? 's' : ''} generated — edit before adding
            </Typography>
          </Box>
          <IconButton
            size="small"
            onClick={onClose}
            sx={{
              width: 28,
              height: 28,
              color: alpha(brand[700], 0.4),
              '&:hover': { bgcolor: alpha(brand[300], 0.2), color: brand[700] },
            }}
          >
            <CloseIcon sx={{ fontSize: 15 }} />
          </IconButton>
        </Box>

        {/* Global controls bar */}
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 1.5,
            bgcolor: alpha('#fff', 0.6),
            border: `1px solid ${alpha(brand[300], 0.25)}`,
            borderRadius: '10px',
            px: 1.5,
            py: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Typography
              sx={{
                fontSize: '0.6rem',
                fontWeight: 700,
                color: alpha(brand[700], 0.6),
                whiteSpace: 'nowrap',
              }}
            >
              Set main view mode for all cards:
            </Typography>
            <ToggleButtonGroup
              value={allViewMode}
              exclusive
              size="small"
              onChange={(_, v) => {
                if (v) handleSetAllViewMode(v);
              }}
              sx={toggleSx}
            >
              <ToggleButton value="romaji">ABC Romaji</ToggleButton>
              <ToggleButton value="hiragana">ひ Hiragana</ToggleButton>
              <ToggleButton value="kanji">漢 Kanji</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Box>
      </Box>

      {/* Card list */}
      <DialogContent
        sx={{
          px: 2,
          pt: 2,
          pb: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {cards.length === 0 && (
          <Typography
            sx={{ textAlign: 'center', color: alpha(brand[700], 0.6), fontSize: '0.85rem', py: 4 }}
          >
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
          disabled={cards.length === 0}
          onClick={handleConfirm}
          startIcon={<CheckIcon sx={{ fontSize: 16 }} />}
          sx={{
            borderRadius: '10px',
            fontWeight: 800,
            fontSize: '0.82rem',
            textTransform: 'none',
            background:
              cards.length > 0
                ? `linear-gradient(135deg, ${brand[400]} 0%, ${brand[500]} 50%, ${accent[500]} 100%)`
                : undefined,
            boxShadow: cards.length > 0 ? `0 4px 14px ${alpha(brand[500], 0.35)}` : undefined,
            '&:hover': { boxShadow: `0 6px 20px ${alpha(brand[500], 0.45)}` },
          }}
        >
          Add {cards.length} Card{cards.length !== 1 ? 's' : ''} to Deck
        </Button>
      </Box>
    </Dialog>
  );
}
