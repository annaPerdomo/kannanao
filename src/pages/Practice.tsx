'use client';
import { Box, Typography, IconButton, Chip } from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';

import { MatchMode } from '@/components/Practice/MatchMode';
import { FillMode } from '@/components/Practice/FillMode';
import { RecallMode } from '@/components/Practice/RecallMode';
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

export function Practice({ deckId, mode, onBack }: PracticeProps) {
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
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4, p: 3, borderRadius: 3, bgcolor: '#FFF2F8', border: '1px solid rgba(249,168,212,0.45)', boxShadow: '0 12px 28px rgba(249,168,212,0.12)' }}>
        <IconButton onClick={onBack} size="small">
          <ArrowBackIosNewIcon fontSize="small" />
        </IconButton>
        <Typography variant="h5" sx={{ flexGrow: 1, color: '#BE185D' }}>
          {LABELS[mode]}
        </Typography>
        <Chip label={`${cards.length} cards`} size="small" />
      </Box>

      {cards.length < 2 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography color="text.secondary">Not enough cards to practice. Add more cards to this deck.</Typography>
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
