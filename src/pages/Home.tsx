'use client';
import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import LinearProgress from '@mui/material/LinearProgress';
import Chip from '@mui/material/Chip';
import { useRouter } from 'next/navigation';

import { DeckCard } from '@/components/DeckCard';
import { ShareDeckDialog } from '@/components/ShareDeckDialog';
import { Loading } from '@/components/Loading';
import { TodoList } from '@/components/TodoList';
import { useDecks } from '@/hooks/useDecks';
import { useAuth } from '@/contexts/AuthContext';
import { useProgress, xpProgressInLevel } from '@/hooks/useProgess';

function getGreeting(name: string): { text: string; emoji: string } {
  const h = new Date().getHours();
  if (h < 12) return { text: `Good morning, ${name}!`, emoji: '🌸' };
  if (h < 17) return { text: `Hey there, ${name}!`,    emoji: '☀️' };
  return           { text: `Good evening, ${name}!`,   emoji: '🌙' };
}

function WelcomeBanner({ username, level, streak, totalXp }: {
  username: string; level: number; streak: number; totalXp: number;
}) {
  const { text, emoji } = getGreeting(username);
  const { current, needed } = xpProgressInLevel(totalXp);
  const pct = Math.round((current / needed) * 100);

  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 4,
        mb: 4,
        p: { xs: 3, sm: 3.5 },
        background: 'linear-gradient(135deg, #FFDDF4 0%, #EDE9FE 50%, #D1FAE5 100%)',
        border: '2px solid rgba(244,114,182,0.2)',
        boxShadow: '0 8px 40px rgba(196,181,253,0.22)',
      }}
    >
      {/* Decorative blobs */}
      <Box sx={{ position: 'absolute', top: -30, right: -30, width: 130, height: 130, borderRadius: '50%', background: 'rgba(244,114,182,0.12)', pointerEvents: 'none' }} />
      <Box sx={{ position: 'absolute', bottom: -20, left: '40%', width: 90, height: 90, borderRadius: '50%', background: 'rgba(196,181,253,0.15)', pointerEvents: 'none' }} />

      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" spacing={2}>
        <Box>
          <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
            <Typography sx={{ fontSize: { xs: '1.6rem', sm: '1.9rem' } }}>{emoji}</Typography>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 800,
                fontSize: { xs: '1.4rem', sm: '1.7rem' },
                background: 'linear-gradient(90deg, #BE185D 0%, #7C3AED 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {text}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip
              label={`✨ Level ${level}`}
              size="small"
              sx={{ fontWeight: 800, bgcolor: 'rgba(244,114,182,0.15)', color: 'primary.dark', border: '1.5px solid rgba(244,114,182,0.3)' }}
            />
            {streak > 0 && (
              <Chip
                label={`🔥 ${streak} day streak`}
                size="small"
                sx={{ fontWeight: 800, bgcolor: 'rgba(251,191,36,0.15)', color: '#B45309', border: '1.5px solid rgba(251,191,36,0.35)' }}
              />
            )}
          </Stack>
        </Box>

        {/* XP bar */}
        <Box sx={{ minWidth: { sm: 200 }, width: { xs: '100%', sm: 220 } }}>
          <Stack direction="row" justifyContent="space-between" mb={0.5}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'secondary.dark' }}>XP Progress</Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>{current} / {needed}</Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={pct}
            sx={{
              height: 10,
              borderRadius: 5,
              bgcolor: 'rgba(196,181,253,0.25)',
              '& .MuiLinearProgress-bar': {
                background: 'linear-gradient(90deg, #F472B6, #8B5CF6)',
                borderRadius: 5,
                transition: 'width 0.6s ease',
              },
            }}
          />
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mt: 0.5, display: 'block' }}>
            {needed - current} XP to level {level + 1} 🚀
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
}

export default function Home() {
  const { decks, deleteDeck, loading } = useDecks();
  const { user, displayName } = useAuth();
  const { progress, addBonusXp } = useProgress();
  const router = useRouter();

  const [shareDeckId, setShareDeckId] = useState<string | null>(null);
  const [shareDeckName, setShareDeckName] = useState('');

  const username = displayName ?? user?.email?.split('@')[0] ?? 'there';
  const isOwner = (deck: { ownerId: string }) => deck.ownerId === user?.id;

  if (loading) {
    return (
      <Box sx={{ maxWidth: 1100, mx: 'auto', px: { xs: 2, sm: 4 }, py: 6 }}>
        <Loading message="Loading your decks…" />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', px: { xs: 2, sm: 4 }, py: { xs: 3, sm: 5 } }}>
      {/* Welcome banner — shown once progress has loaded */}
      {progress && (
        <WelcomeBanner
          username={username}
          level={progress.level}
          streak={progress.streak_days}
          totalXp={progress.total_xp}
        />
      )}

      <Grid container spacing={3} alignItems="flex-start">
        {/* Decks — left, wider column */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Typography variant="h5" sx={{ color: 'text.primary', mb: 2, fontWeight: 800 }}>
            {decks.length > 0 ? '📚 Your Decks' : '📚 No decks yet'}
          </Typography>

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
              <Typography sx={{ fontFamily: '"Noto Serif JP", serif', fontSize: '4rem', color: 'rgba(249,168,212,0.25)', mb: 2, lineHeight: 1 }}>
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
                      onShare={owned ? (id) => { setShareDeckId(id); setShareDeckName(deck.name); } : undefined}
                      isOwner={owned}
                    />
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Grid>

        {/* Todo list — right column, sticky */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Box sx={{ position: { md: 'sticky' }, top: { md: 24 } }}>
            <TodoList onXpEarned={addBonusXp} />
          </Box>
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
