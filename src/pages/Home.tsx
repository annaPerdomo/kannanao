'use client';
import {
  Box,
  Typography,
  Grid,
} from '@mui/material';

import { DeckCard } from '@/components/DeckCard';
import { Loading } from '@/components/Loading';
import { useDecks } from '@/hooks/useDecks';

interface HomeProps {
  onOpenDeck: (id: string) => void;
}

export function Home({ onOpenDeck }: HomeProps) {
  const { decks, deleteDeck, loading } = useDecks();

    if (loading) {
    return (
      <Box sx={{ maxWidth: 1100, mx: 'auto', px: { xs: 2, sm: 4 }, py: 6 }}>
        <Loading message="Loading your decks…" />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', px: { xs: 2, sm: 4 }, py: 6 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ color: 'text.primary' }}>
          {decks.length > 0 ? 'Your Decks' : 'No decks yet'}
        </Typography>
      </Box>

      {decks.length === 0 ? (
        <Box
          sx={{
            border: '1px dashed rgba(249,168,212,0.35)',
            borderRadius: 3,
            p: 8,
            textAlign: 'center',
            bgcolor: '#FFF3F9',
            boxShadow: '0 12px 26px rgba(249,168,212,0.12)',
          }}
        >
          <Typography
            sx={{
              fontFamily: '"Noto Serif JP", serif',
              fontSize: '4rem',
              color: 'rgba(249,168,212,0.25)',
              mb: 2,
              lineHeight: 1,
            }}
          >
            漢
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Create your first deck to start building flashcards
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {decks.map((deck) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={deck.id}>
              <DeckCard deck={deck} onOpen={onOpenDeck} onDelete={deleteDeck} />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
