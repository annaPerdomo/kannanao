'use client';

import CheckIcon from '@mui/icons-material/Check';
import { Box, Button, Dialog, DialogContent, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';

import type { MainViewMode } from '@/types/flashcard';

import { CardRow, type PendingCard } from './CardRow';
import { RegenerateBar } from './RegenerateBar';
import { ReviewHeader } from './ReviewHeader';

interface ReviewCardsDialogProps {
  open: boolean;
  cards: PendingCard[];
  onConfirm: (cards: PendingCard[]) => void;
  onClose: () => void;
  /**
   * Redo the given words with a correction applied. The dialog has no deck id
   * of its own, so the owner of the flow supplies this; leaving it off hides
   * the selection UI entirely.
   */
  onRegenerate?: (words: string[], instruction: string) => Promise<PendingCard[]>;
}

export function ReviewCardsDialog({
  open,
  cards: initialCards,
  onConfirm,
  onClose,
  onRegenerate,
}: ReviewCardsDialogProps) {
  const theme = useTheme();
  const tRegen = useTranslations('Deck.reviewCardsDialog.regenerate');
  const tReuse = useTranslations('Deck.reviewCardsDialog.reuse');
  const { brand, accent } = theme.palette;
  const [cards, setCards] = useState<PendingCard[]>(initialCards);
  const [originalExamples, setOriginalExamples] = useState<string[]>(() =>
    initialCards.map((c) => c.example_jp),
  );
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [regenerating, setRegenerating] = useState(false);
  const [regenError, setRegenError] = useState<string | null>(null);

  const [prevInitial, setPrevInitial] = useState(initialCards);
  if (initialCards !== prevInitial) {
    setPrevInitial(initialCards);
    setCards(initialCards);
    setOriginalExamples(initialCards.map((c) => c.example_jp));
    setSelected(new Set());
    setRegenError(null);
  }

  const handleUpdate = useCallback((index: number, patch: Partial<PendingCard>) => {
    setCards((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }, []);

  const handleDelete = useCallback((index: number) => {
    setCards((prev) => prev.filter((_, i) => i !== index));
    setOriginalExamples((prev) => prev.filter((_, i) => i !== index));
    // Selection is by position, so removing a row renumbers everything below it.
    setSelected((prev) => {
      const next = new Set<number>();
      for (const i of prev) {
        if (i < index) next.add(i);
        else if (i > index) next.add(i - 1);
      }
      return next;
    });
    setExpandedIndex((prev) =>
      prev === null || prev === index ? null : prev > index ? prev - 1 : prev,
    );
  }, []);

  const handleToggleSelect = useCallback((index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (!next.delete(index)) next.add(index);
      return next;
    });
  }, []);

  const handleSetAllViewMode = useCallback((mode: MainViewMode) => {
    setCards((prev) => prev.map((c) => ({ ...c, mainViewMode: mode })));
  }, []);

  const handleToggleExpand = useCallback((index: number) => {
    setExpandedIndex((prev) => (prev === index ? null : index));
  }, []);

  const reusedCount = cards.filter((c) => c.reusedFrom !== undefined).length;

  /**
   * Trade every saved card back for what the model wrote. The fresh copy has no
   * image — reuse is what skipped the lookup — so the row shows the placeholder
   * until the reviewer fetches one from the expanded panel.
   */
  const handleUseFresh = useCallback(() => {
    setCards((prev) => prev.map((c) => c.freshVersion ?? c));
    setOriginalExamples((prev) =>
      prev.map((example, i) => cards[i]?.freshVersion?.example_jp ?? example),
    );
  }, [cards]);

  const handleConfirm = () => {
    if (cards.length === 0) return;
    onConfirm(cards);
  };

  const handleRegenerate = useCallback(
    async (instruction: string) => {
      if (!onRegenerate) return;
      const indices = [...selected].sort((a, b) => a - b);
      if (indices.length === 0) return;

      setRegenerating(true);
      setRegenError(null);
      try {
        const fresh = await onRegenerate(
          indices.map((i) => cards[i].word),
          instruction,
        );
        // Positional swap: expansion is off for a retry, so card n of the
        // response answers word n of the request. Anything short of a full set
        // leaves the surplus rows as they were rather than shifting them.
        setCards((prev) => {
          const next = [...prev];
          indices.forEach((cardIndex, n) => {
            if (fresh[n]) next[cardIndex] = fresh[n];
          });
          return next;
        });
        setOriginalExamples((prev) => {
          const next = [...prev];
          indices.forEach((cardIndex, n) => {
            if (fresh[n]) next[cardIndex] = fresh[n].example_jp;
          });
          return next;
        });
        if (fresh.length < indices.length) {
          setRegenError(tRegen('partial', { got: fresh.length, asked: indices.length }));
        } else {
          setSelected(new Set());
        }
      } catch (err) {
        setRegenError(err instanceof Error ? err.message : tRegen('failed'));
      } finally {
        setRegenerating(false);
      }
    },
    [cards, onRegenerate, selected, tRegen],
  );

  const allViewMode =
    cards.length > 0 && cards.every((c) => c.mainViewMode === cards[0].mainViewMode)
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
            bgcolor: brand[50],
            backgroundImage: 'none',
            border: `1.5px solid ${alpha(brand[300], 0.4)}`,
            boxShadow: `0 20px 60px ${alpha(brand[500], 0.14)}, 0 4px 16px ${alpha(brand[300], 0.2)}`,
            borderRadius: (theme) => theme.radii.md,
            overflow: 'hidden',
            maxHeight: '85vh',
          },
        },
      }}
    >
      <ReviewHeader
        cardCount={cards.length}
        allViewMode={allViewMode}
        onSetAllViewMode={handleSetAllViewMode}
        onClose={onClose}
      />

      {reusedCount > 0 && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flexWrap: 'wrap',
            px: 2.5,
            py: 1.25,
            bgcolor: alpha(accent[100], 0.5),
            borderBottom: `1px solid ${alpha(accent[300], 0.35)}`,
          }}
        >
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: 'text.primary' }}>
            {tReuse('banner', { count: reusedCount })}
          </Typography>
          <Button
            size="small"
            onClick={handleUseFresh}
            sx={{
              minWidth: 0,
              px: 0.75,
              fontSize: '0.68rem',
              fontWeight: 800,
              textTransform: 'none',
              color: brand[700],
            }}
          >
            {tReuse('useNewInstead')}
          </Button>
        </Box>
      )}

      {/* Card list */}
      <DialogContent
        sx={{
          px: 2,
          pt: 2,
          pb: 1,
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
            selected={selected.has(i)}
            onToggleSelect={onRegenerate ? handleToggleSelect : undefined}
          />
        ))}
      </DialogContent>

      {onRegenerate && cards.length > 0 && (
        <RegenerateBar
          selectedCount={selected.size}
          busy={regenerating}
          error={regenError}
          onRegenerate={handleRegenerate}
          onSelectAll={() => setSelected(new Set(cards.map((_, i) => i)))}
          onClearSelection={() => setSelected(new Set())}
          allSelected={selected.size === cards.length}
        />
      )}

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
          disabled={cards.length === 0 || regenerating}
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
