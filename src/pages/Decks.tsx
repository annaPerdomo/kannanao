'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import AddIcon from '@mui/icons-material/Add';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import { useRouter } from 'next/navigation';
import { Loading } from '@/components/Loading';
import { DeckCard } from '@/components/DeckCard';
import { ShareDeckDialog } from '@/components/ShareDeckDialog';
import { useDecks } from '@/hooks/useDecks';
import { useAuth } from '@/contexts/AuthContext';

export default function Decks() {
  const theme = useTheme();
  const { brand, accent, surfaces } = theme.palette;
  const router = useRouter();

  const { decks, loading, createDeck, deleteDeck, updateDeckEmoji, pinDeck } = useDecks();
  const { user } = useAuth();

  const [createOpen, setCreateOpen] = useState(false);
  const [nameVal, setNameVal] = useState('');
  const [descVal, setDescVal] = useState('');
  const [creating, setCreating] = useState(false);

  const [shareDeckId, setShareDeckId] = useState<string | null>(null);
  const [shareDeckName, setShareDeckName] = useState('');

  const isOwner = (deck: { ownerId: string }) => deck.ownerId === user?.id;

  const handleCreate = async () => {
    const name = nameVal.trim();
    if (!name) return;
    setCreating(true);
    try {
      const deck = await createDeck(name, descVal.trim() || undefined);
      setCreateOpen(false);
      setNameVal('');
      setDescVal('');
      router.push(`/deck/${deck.id}`);
    } finally {
      setCreating(false);
    }
  };

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

      {/* ── Hero Header ── */}
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 4,
          mb: 4,
          p: { xs: 3, sm: 4 },
          background: `linear-gradient(135deg, ${alpha(brand[100], 0.9)} 0%, ${alpha(accent[100], 0.8)} 100%)`,
          border: `2px solid ${alpha(brand[300], 0.3)}`,
          boxShadow: `0 8px 40px ${alpha(brand[300], 0.2)}`,
        }}
      >
        <Box sx={{ position: 'absolute', top: -30, right: -30, width: 150, height: 150, borderRadius: '50%', background: alpha(accent[200], 0.2), pointerEvents: 'none' }} />
        <Box sx={{ position: 'absolute', bottom: -20, left: '30%', width: 100, height: 100, borderRadius: '50%', background: alpha(brand[200], 0.2), pointerEvents: 'none' }} />

        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" spacing={2}>
          <Box>
            <Stack direction="row" alignItems="center" spacing={1.5} mb={0.75}>
              <Typography sx={{ fontSize: { xs: '2rem', sm: '2.5rem' } }}>📚</Typography>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 800, color: brand[800], lineHeight: 1.1 }}>
                  Your Decks
                </Typography>
                <Typography variant="body2" sx={{ color: brand[600], mt: 0.25 }}>
                  Flashcard Collections
                </Typography>
              </Box>
            </Stack>
            <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 380 }}>
              Pin decks to see them on your home page. ✨
            </Typography>
          </Box>

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateOpen(true)}
            sx={{
              flexShrink: 0,
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
        </Stack>
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

          {/* All / unpinned section */}
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

      {/* ── Create Dialog ── */}
      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        slotProps={{
          paper: {
            sx: {
              borderRadius: 4,
              border: `1.5px solid ${alpha(brand[300], 0.35)}`,
              boxShadow: `0 8px 40px ${alpha(brand[700], 0.14)}`,
              bgcolor: surfaces.overlay,
              minWidth: { xs: 320, sm: 400 },
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: brand[700], pb: 1 }}>
          New Deck
        </DialogTitle>
        <DialogContent sx={{ pt: '8px !important' }}>
          <Stack spacing={2}>
            <TextField
              autoFocus
              fullWidth
              size="small"
              label="Deck name"
              placeholder="e.g. N5 Vocabulary"
              value={nameVal}
              onChange={(e) => setNameVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void handleCreate(); }}
            />
            <TextField
              fullWidth
              size="small"
              label="Description (optional)"
              placeholder="e.g. Common N5 words"
              value={descVal}
              onChange={(e) => setDescVal(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setCreateOpen(false)} sx={{ color: 'text.secondary' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={creating || !nameVal.trim()}
          >
            {creating ? 'Creating…' : 'Create ✨'}
          </Button>
        </DialogActions>
      </Dialog>

      <ShareDeckDialog
        open={shareDeckId !== null}
        onClose={() => setShareDeckId(null)}
        deckId={shareDeckId ?? ''}
        deckName={shareDeckName}
      />
    </Box>
  );
}
