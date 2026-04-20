'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import AddIcon from '@mui/icons-material/Add';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import { useRouter } from 'next/navigation';
import { Loading } from '@/components/Loading';
import { DeckCard } from '@/components/DeckCard';
import { ShareDeckDialog } from '@/components/ShareDeckDialog';
import { CreateDeckDialog } from '@/components/CreateDeckDialog';
import { PageHeader } from '@/components/PageHeader';
import { useDecks } from '@/hooks/useDecks';
import { useAuth } from '@/contexts/AuthContext';

export default function Decks() {
  const theme = useTheme();
  const { brand, accent } = theme.palette;
  const router = useRouter();

  const { decks, loading, deleteDeck, updateDeckEmoji, pinDeck } = useDecks();
  const { user } = useAuth();

  const [createOpen, setCreateOpen] = useState(false);
  const [shareDeckId, setShareDeckId] = useState<string | null>(null);
  const [shareDeckName, setShareDeckName] = useState('');

  const isOwner = (deck: { ownerId: string }) => deck.ownerId === user?.id;

  if (loading) {
    return (
      <Box sx={{ maxWidth: 1100, mx: 'auto', px: { xs: 2, sm: 4 }, py: 6 }}>
        <Loading message="Loading your decks…" />
      </Box>
    );
  }

  const pinnedDecks = decks.filter((d) => d.pinned);
  const unpinnedDecks = decks.filter((d) => !d.pinned);

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', px: { xs: 2, sm: 4 }, py: { xs: 3, sm: 5 } }}>

      <PageHeader
        emoji="📚"
        title="Your Decks"
        subtitle="Flashcard Collections"
        description="Pin decks to see them on your home page. ✨"
        onBack={() => router.push('/')}
        action={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateOpen(true)}
            sx={{
              borderRadius: 3,
              px: 2.5,
              py: 1,
              fontWeight: 800,
              background: `linear-gradient(135deg, ${brand[400]}, ${accent[400]})`,
              boxShadow: `0 4px 16px ${alpha(brand[400], 0.35)}`,
              '&:hover': {
                background: `linear-gradient(135deg, ${brand[500]}, ${accent[500]})`,
              },
            }}
          >
            New Deck
          </Button>
        }
      />

      {decks.length === 0 ? (
        <Box
          sx={{
            border: `1.5px dashed ${alpha(brand[300], 0.45)}`,
            borderRadius: 4,
            p: 8,
            textAlign: 'center',
            bgcolor: alpha(brand[50], 0.6),
          }}
        >
          <Typography sx={{ fontSize: '3.5rem', mb: 2 }}>📭</Typography>
          <Typography variant="h6" sx={{ color: brand[700], fontWeight: 700, mb: 1 }}>
            No decks yet!
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3, fontSize: '0.875rem' }}>
            Create your first deck to start building flashcards
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateOpen(true)}
          >
            Create Deck
          </Button>
        </Box>
      ) : (
        <>
          {/* Pinned section */}
          {pinnedDecks.length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ color: brand[700], fontWeight: 800, mb: 2, fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                📌 Pinned to Home
              </Typography>
              <Grid container spacing={2}>
                {pinnedDecks.map((deck) => {
                  const owned = isOwner(deck);
                  return (
                    <Grid size={{ xs: 12, sm: 6, md: 4 }} key={deck.id}>
                      <DeckCard
                        deck={deck}
                        onOpen={(id) => router.push(`/deck/${id}`)}
                        onDelete={owned ? deleteDeck : () => {}}
                        onShare={owned ? (id) => { setShareDeckId(id); setShareDeckName(deck.name); } : undefined}
                        onEditEmoji={owned ? updateDeckEmoji : undefined}
                        onPin={pinDeck}
                        isOwner={owned}
                      />
                    </Grid>
                  );
                })}
              </Grid>
            </Box>
          )}

          {/* Unpinned / all section */}
          {unpinnedDecks.length > 0 && (
            <Box>
              {pinnedDecks.length > 0 && (
                <Typography variant="h6" sx={{ color: brand[700], fontWeight: 800, mb: 2, fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  All Decks
                </Typography>
              )}
              <Grid container spacing={2}>
                {unpinnedDecks.map((deck) => {
                  const owned = isOwner(deck);
                  return (
                    <Grid size={{ xs: 12, sm: 6, md: 4 }} key={deck.id}>
                      <DeckCard
                        deck={deck}
                        onOpen={(id) => router.push(`/deck/${id}`)}
                        onDelete={owned ? deleteDeck : () => {}}
                        onShare={owned ? (id) => { setShareDeckId(id); setShareDeckName(deck.name); } : undefined}
                        onEditEmoji={owned ? updateDeckEmoji : undefined}
                        onPin={pinDeck}
                        isOwner={owned}
                      />
                    </Grid>
                  );
                })}
              </Grid>
            </Box>
          )}
        </>
      )}

      <CreateDeckDialog open={createOpen} onClose={() => setCreateOpen(false)} />

      <ShareDeckDialog
        open={shareDeckId !== null}
        onClose={() => setShareDeckId(null)}
        deckId={shareDeckId ?? ''}
        deckName={shareDeckName}
      />
    </Box>
  );
}
