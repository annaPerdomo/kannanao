'use client';

import AddIcon from '@mui/icons-material/Add';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { CreateDeckDialog } from '@/components/CreateDeckDialog';
import { DeckCard } from '@/components/DeckCard';
import { Loading } from '@/components/Loading';
import { PageHeader } from '@/components/PageHeader';
import { ShareEmbedDialog } from '@/components/ShareEmbedDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useDecks } from '@/hooks/useDecks';
import { LAYOUT } from '@/theme';

export default function Decks() {
  const theme = useTheme();
  const { brand, accent } = theme.palette;
  const router = useRouter();

  const { decks, loading, deleteDeck, pinDeck, setDeckPublic } = useDecks();
  const { user, isMemberAccount } = useAuth();

  const [createOpen, setCreateOpen] = useState(false);
  const [shareDeckId, setShareDeckId] = useState<string | null>(null);
  const [shareDeckName, setShareDeckName] = useState('');

  const isOwner = (deck: { ownerId: string }) => deck.ownerId === user?.id;

  if (loading) {
    return (
      <Box sx={{ maxWidth: LAYOUT.contentMaxWidth, mx: 'auto', px: LAYOUT.pagePx, py: 6 }}>
        <Loading message="Loading your decks…" />
      </Box>
    );
  }

  const pinnedDecks = decks.filter((d) => d.pinned);
  const unpinnedDecks = decks.filter((d) => !d.pinned);

  return (
    <Box
      sx={{ maxWidth: LAYOUT.contentMaxWidth, mx: 'auto', px: LAYOUT.pagePx, py: { xs: 3, sm: 5 } }}
    >
      <Box sx={{ maxWidth: LAYOUT.headerMaxWidth, mx: 'auto' }}>
        <PageHeader
          emoji="📚"
          title="Your Decks"
          subtitle="Pin decks to see them on your home page. ✨"
          onBack={() => router.push('/')}
          action={
            !isMemberAccount ? (
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
            ) : undefined
          }
        />
      </Box>

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
            {isMemberAccount ? 'No decks shared yet!' : 'No decks yet!'}
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3, fontSize: '0.875rem' }}>
            {isMemberAccount
              ? 'Your organizer will share decks with you soon — check back later!'
              : 'Create your first deck to start building flashcards'}
          </Typography>
          {!isMemberAccount && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
              Create Deck
            </Button>
          )}
        </Box>
      ) : (
        <>
          {/* Pinned section */}
          {pinnedDecks.length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Typography
                variant="h6"
                sx={{
                  color: brand[700],
                  fontWeight: 800,
                  mb: 2,
                  fontSize: '0.95rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                📌 Pinned to Home
              </Typography>
              <Grid container spacing={2}>
                {pinnedDecks.map((deck) => {
                  const owned = isOwner(deck);
                  return (
                    <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2.4 }} key={deck.id}>
                      <DeckCard
                        deck={deck}
                        onOpen={(id) => router.push(`/deck/${id}`)}
                        onDelete={owned ? deleteDeck : () => {}}
                        onShare={
                          owned
                            ? (id) => {
                                setShareDeckId(id);
                                setShareDeckName(deck.name);
                              }
                            : undefined
                        }
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
                <Typography
                  variant="h6"
                  sx={{
                    color: brand[700],
                    fontWeight: 800,
                    mb: 2,
                    fontSize: '0.95rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  All Decks
                </Typography>
              )}
              <Grid container spacing={2}>
                {unpinnedDecks.map((deck) => {
                  const owned = isOwner(deck);
                  return (
                    <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2.4 }} key={deck.id}>
                      <DeckCard
                        deck={deck}
                        onOpen={(id) => router.push(`/deck/${id}`)}
                        onDelete={owned ? deleteDeck : () => {}}
                        onShare={
                          owned
                            ? (id) => {
                                setShareDeckId(id);
                                setShareDeckName(deck.name);
                              }
                            : undefined
                        }
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

      <ShareEmbedDialog
        open={shareDeckId !== null}
        onClose={() => setShareDeckId(null)}
        deckId={shareDeckId ?? ''}
        deckName={shareDeckName}
        isPublic={decks.find((d) => d.id === shareDeckId)?.isPublic ?? false}
        onPublicChange={(val) => {
          if (shareDeckId) setDeckPublic(shareDeckId, val);
        }}
      />
    </Box>
  );
}
