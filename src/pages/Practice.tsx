'use client';
import { Box, Typography } from '@mui/material';

import { MatchMode } from '@/components/Practice/MatchMode';
import { FillMode } from '@/components/Practice/FillMode';
import { RecallMode } from '@/components/Practice/RecallMode';
import { SectionHeader } from '@/components/SectionHeader';
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
  recall: 'Recall Typing',
};

export default function Practice({ deckId, mode, onBack }: PracticeProps) {
  const { cards, loading } = useCards(deckId);

  if (loading) {
    return (
      <Box sx={{ maxWidth: 800, mx: 'auto', px: { xs: 2, sm: 4 }, py: 4 }}>
        <Loading message="Loading your practice session…" />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', px: { xs: 2, sm: 4 }, py: 4 }}>
      <SectionHeader
        title={LABELS[mode]}
        onBack={onBack}
        badge={`${cards.length} cards`}
      />

      {cards.length < 2 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography color="text.secondary">
            Not enough cards to practice. Add more cards to this deck.
          </Typography>
        </Box>
      ) : (
        <>
          {mode === 'match' && <MatchMode cards={cards} deckId={deckId} onExit={onBack} />}
          {mode === 'fill' && <FillMode deckId={deckId} cards={cards} onExit={onBack} />}
          {mode === 'recall' && <RecallMode cards={cards} deckId={deckId} onExit={onBack} />}
        </>
      )}
    </Box>
  );
}