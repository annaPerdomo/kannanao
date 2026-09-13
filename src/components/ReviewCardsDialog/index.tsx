'use client';

import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import { alpha, useTheme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';

import { swapReusedVersion } from '@/services/cardPipeline';
import type { MainViewMode } from '@/types/flashcard';

import { CardList } from './CardList';
import { DialogFooter } from './DialogFooter';
import { RegenerateBar } from './RegenerateBar';
import { ReuseBanner } from './ReuseBanner';
import { ReviewHeader } from './ReviewHeader';
import type { PendingCard } from './types';

export type { PendingCard } from './types';

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
  /**
   * Copy overrides for the picture review, which reopens this dialog over cards
   * that are already in the deck — "add them" would be the wrong promise there.
   */
  title?: string;
  subtitle?: string;
  confirmLabel?: string;
  /**
   * Off for the picture review. Removing a row means "don't add this card",
   * which is only true while the cards are still pending — over saved cards the
   * button looked like a delete and did nothing at all.
   */
  allowRemove?: boolean;
  /** Confirm is in flight; the dialog stays open and locked until it lands. */
  saving?: boolean;
  saveError?: string | null;
}

export function ReviewCardsDialog({
  open,
  cards: initialCards,
  onConfirm,
  onClose,
  onRegenerate,
  title,
  subtitle,
  confirmLabel,
  allowRemove = true,
  saving = false,
  saveError = null,
}: ReviewCardsDialogProps) {
  const theme = useTheme();
  const tRegen = useTranslations('Deck.reviewCardsDialog.regenerate');
  const { brand } = theme.palette;
  const [cards, setCards] = useState<PendingCard[]>(initialCards);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [regenerating, setRegenerating] = useState(false);
  const [regenError, setRegenError] = useState<string | null>(null);

  const [prevInitial, setPrevInitial] = useState(initialCards);
  if (initialCards !== prevInitial) {
    setPrevInitial(initialCards);
    setCards(initialCards);
    setSelected(new Set());
    setRegenError(null);
  }

  const handleUpdate = useCallback((index: number, patch: Partial<PendingCard>) => {
    setCards((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }, []);

  const handleDelete = useCallback((index: number) => {
    setCards((prev) => prev.filter((_, i) => i !== index));
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

  const handleToggleExpand = useCallback((index: number, open: boolean) => {
    setExpandedIndex(open ? index : null);
  }, []);

  const swappable = cards.filter((c) => c.alternate);
  const reusedCount = swappable.length;
  const showingFresh = reusedCount > 0 && swappable.every((c) => c.showingFresh);

  /**
   * Flip every swappable row to its other version. The card coming off screen
   * becomes the new alternate, so this button reverses itself — the reviewer
   * can go back and forth as many times as they like.
   */
  const handleSwapVersions = useCallback(() => {
    setCards((prev) => prev.map(swapReusedVersion));
  }, []);

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
            if (!fresh[n]) return;
            // A replacement is generated with the flow's default mode, so
            // without this a redo quietly undoes the header's set-them-all
            // toggle for that one row.
            next[cardIndex] = {
              ...fresh[n],
              mainViewMode: prev[cardIndex].mainViewMode,
            };
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
        title={title}
        subtitle={subtitle}
      />

      <ReuseBanner
        reusedCount={reusedCount}
        showingFresh={showingFresh}
        onSwapVersions={handleSwapVersions}
      />

      <CardList
        cards={cards}
        expandedIndex={expandedIndex}
        selected={selected}
        allowRemove={allowRemove}
        showSelection={Boolean(onRegenerate)}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onToggleSelect={handleToggleSelect}
        onToggleExpand={handleToggleExpand}
      />

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

      {saveError && (
        <Alert severity="error" sx={{ mx: 2.5, mb: 1, fontSize: '0.78rem', py: 0 }}>
          {saveError}
        </Alert>
      )}

      <DialogFooter
        cardCount={cards.length}
        saving={saving}
        regenerating={regenerating}
        confirmLabel={confirmLabel}
        onClose={onClose}
        onConfirm={handleConfirm}
      />
    </Dialog>
  );
}
