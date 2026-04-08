'use client';
import { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
} from '@mui/material';
import { useRouter } from 'next/navigation';

import { DeckCard } from '@/components/DeckCard';
import { ShareDeckDialog } from '@/components/ShareDeckDialog';
import { Loading } from '@/components/Loading';
import { TodoList } from '@/components/TodoList';
import { useDecks } from '@/hooks/useDecks';
import { useAuth } from '@/contexts/AuthContext';

export default function Home() {
  const { decks, deleteDeck, loading } = useDecks();
  const { user } = useAuth();
  const router = useRouter();

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

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', px: { xs: 2, sm: 4 }, py: 6 }}>
      {/* Two-column layout on larger screens: todo list + decks side by side */}
      <Grid container spacing={3} alignItems="flex-start">
        {/* To-Do List — left column, sticky on large screens */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Box sx={{ position: { md: 'sticky' }, top: { md: 24 } }}>
            <TodoList />
          </Box>
        </Grid>

        {/* Decks — right column */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
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
              {decks.map((deck) => {
                const owned = isOwner(deck);
                return (
                  <Grid size={{ xs: 12, sm: 6 }} key={deck.id}>
                    <DeckCard
                      deck={deck}
                      onOpen={(id) => router.push(`/deck/${id}`)}
                      onDelete={owned ? deleteDeck : () => {}}
                      onShare={owned ? (id) => {
                        setShareDeckId(id);
                        setShareDeckName(deck.name);
                      } : undefined}
                      isOwner={owned}
                    />
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Grid>
      </Grid>

      <ShareDeckDialog
        open={shareDeckId !== null}
        onClose={() => setShareDeckId(null)}
        deckId={shareDeckId ?? ''}
        deckName={shareDeckName}
      />
    </Box>
  );
}
