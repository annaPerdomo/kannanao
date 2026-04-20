'use client';
import { useState } from 'react';
import { Box, Typography } from '@mui/material';

import { MatchMode } from '@/components/Practice/MatchMode';
import { FillMode } from '@/components/Practice/FillMode';
import { RecallMode } from '@/components/Practice/RecallMode';
import { BatchPicker } from '@/components/Practice/BatchPicker';
import { PageHeader } from '@/components/PageHeader';
import { useCards } from '@/hooks/useCards';
import { Loading } from '@/components/Loading';
import type { PracticeMode } from '@/types/app';

interface PracticeProps {
  deckId: string;
  mode: PracticeMode;
  onBack: () => void;
}

const LABELS: Record<PracticeMode, string> = {
  match: 'Match JP ↔ EN',
  fill: 'Fill in the Blank',
  recall: 'Guess It!',
};

/** Show the batch picker when the deck exceeds this many cards. */
const BATCH_PICKER_THRESHOLD = 10;

export default function Practice({ deckId, mode, onBack }: PracticeProps) {
  const { cards, loading } = useCards(deckId);
  const [batchSize, setBatchSize] = useState<number | null>(null);

  if (loading) {
    return (
      <Box sx={{ maxWidth: 800, mx: 'auto', px: { xs: 2, sm: 4 }, py: 4 }}>
        <Loading message="Loading your practice session…" />
      </Box>
    );
  }

  if (cards.length < 2) {
    return (
      <Box sx={{ maxWidth: 800, mx: 'auto', px: { xs: 2, sm: 4 }, py: 4 }}>
        <PageHeader title={LABELS[mode]} onBack={onBack} badge={`${cards.length} cards`} compact mb={3} />
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography color="text.secondary">
            Not enough cards to practice. Add more cards to this deck.
          </Typography>
        </Box>
      </Box>
    );
  }

  // Show batch picker for large decks
  const needsPicker = cards.length > BATCH_PICKER_THRESHOLD;
  if (needsPicker && batchSize === null) {
    return (
      <Box sx={{ maxWidth: 800, mx: 'auto', px: { xs: 2, sm: 4 }, py: 4 }}>
        <PageHeader title={LABELS[mode]} onBack={onBack} badge={`${cards.length} cards`} compact mb={3} />
        <BatchPicker totalCards={cards.length} mode={mode} onSelect={setBatchSize} onBack={onBack} />
      </Box>
    );
  }

  const effectiveBatchSize = batchSize ?? cards.length;

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', px: { xs: 2, sm: 4 }, py: 4 }}>
      <PageHeader title={LABELS[mode]} onBack={onBack} badge={`${cards.length} cards`} compact mb={3} />

      {mode === 'match' && (
        <MatchMode cards={cards} deckId={deckId} batchSize={effectiveBatchSize} onExit={onBack} />
      )}
      {mode === 'fill' && (
        <FillMode cards={cards} deckId={deckId} batchSize={effectiveBatchSize} onExit={onBack} />
      )}
      {mode === 'recall' && (
        <RecallMode cards={cards} deckId={deckId} batchSize={effectiveBatchSize} onExit={onBack} />
      )}
    </Box>
  );
}
