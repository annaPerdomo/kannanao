'use client';
import { useState } from 'react';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import LinearProgress from '@mui/material/LinearProgress';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import { useRouter } from 'next/navigation';

import { DeckCard } from '@/components/DeckCard';
import { ShareDeckDialog } from '@/components/ShareDeckDialog';
import { Loading } from '@/components/Loading';
import { TodoList } from '@/components/TodoList';
import { useDecks } from '@/hooks/useDecks';
import { useAuth } from '@/contexts/AuthContext';
import { useProgress, xpProgressInLevel } from '@/hooks/useProgess';
import { useOhanashikais } from '@/hooks/useOhanashikais';

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
  const theme = useTheme();
  const { brand, accent } = theme.palette;

  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 4,
        mb: 4,
        p: { xs: 3, sm: 3.5 },
        background: `linear-gradient(135deg, ${brand[200]} 0%, ${accent[100]} 45%, ${brand[100]} 100%)`,
        border: `2px solid ${alpha(brand[300], 0.35)}`,
        boxShadow: `0 8px 40px ${alpha(brand[300], 0.28)}, 0 2px 12px ${alpha(accent[300], 0.18)}`,
      }}
    >
      {/* Decorative blobs */}
      <Box sx={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: `radial-gradient(circle, ${alpha(brand[300], 0.35)} 0%, transparent 70%)`, pointerEvents: 'none' }} />
      <Box sx={{ position: 'absolute', bottom: -25, left: '35%', width: 110, height: 110, borderRadius: '50%', background: `radial-gradient(circle, ${alpha(accent[300], 0.3)} 0%, transparent 70%)`, pointerEvents: 'none' }} />
      <Box sx={{ position: 'absolute', top: '10%', left: -20, width: 80, height: 80, borderRadius: '50%', background: `radial-gradient(circle, ${alpha(accent[200], 0.25)} 0%, transparent 70%)`, pointerEvents: 'none' }} />

      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" spacing={2}>
        <Box>
          <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
            <Typography sx={{ fontSize: { xs: '1.6rem', sm: '1.9rem' } }}>{emoji}</Typography>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 800,
                fontSize: { xs: '1.4rem', sm: '1.7rem' },
                background: `linear-gradient(90deg, ${brand[700]} 0%, ${accent[500]} 100%)`,
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
              sx={{ fontWeight: 800, bgcolor: alpha(brand[100], 0.9), color: brand[700], border: `1.5px solid ${alpha(brand[400], 0.4)}` }}
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
            <Typography variant="caption" sx={{ fontWeight: 700, color: brand[700] }}>XP Progress</Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, color: brand[600] }}>{current} / {needed}</Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={pct}
            sx={{
              height: 10,
              borderRadius: 5,
              bgcolor: alpha(brand[200], 0.5),
              '& .MuiLinearProgress-bar': {
                background: `linear-gradient(90deg, ${brand[400]}, ${accent[400]})`,
                borderRadius: 5,
                transition: 'width 0.6s ease',
              },
            }}
          />
          <Typography variant="caption" sx={{ color: brand[600], fontWeight: 600, mt: 0.5, display: 'block' }}>
            {needed - current} XP to level {level + 1} 🚀
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
}

export default function Home() {
  const { decks, deleteDeck, updateDeckEmoji, pinDeck, loading } = useDecks();
  const { user, displayName } = useAuth();
  const { progress, addBonusXp } = useProgress();
  const { ohanashikais } = useOhanashikais();
  const router = useRouter();

  const [shareDeckId, setShareDeckId] = useState<string | null>(null);
  const [shareDeckName, setShareDeckName] = useState('');

  const username = displayName ?? user?.email?.split('@')[0] ?? 'there';
  const isOwner = (deck: { ownerId: string }) => deck.ownerId === user?.id;

  const pinnedDecks = decks.filter((d) => d.pinned);
  const pinnedSpeeches = ohanashikais.filter((o) => o.pinned);

  if (loading) {
    return (
      <Box sx={{ maxWidth: 1100, mx: 'auto', px: { xs: 2, sm: 4 }, py: 6 }}>
        <Loading message="Loading your decks…" />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', px: { xs: 2, sm: 4 }, py: { xs: 3, sm: 5 } }}>
      {/* Welcome banner — full width */}
      {progress && (
        <WelcomeBanner
          username={username}
          level={progress.level}
          streak={progress.streak_days}
          totalXp={progress.total_xp}
        />
      )}

      {/* To-Do Section — centered with side decorations */}
      <Box sx={{ mb: 5, position: 'relative' }}>
        {/* Left decorations */}
        <Box sx={{
          display: { xs: 'none', lg: 'block' },
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: 'calc((100% - 680px) / 2)',
          pointerEvents: 'none',
          '@keyframes float-a': { '0%,100%': { transform: 'translateY(0px) rotate(-8deg)' }, '50%': { transform: 'translateY(-10px) rotate(-4deg)' } },
          '@keyframes float-b': { '0%,100%': { transform: 'translateY(0px) rotate(6deg)' }, '50%': { transform: 'translateY(-14px) rotate(10deg)' } },
          '@keyframes float-c': { '0%,100%': { transform: 'translateY(0px) rotate(0deg)' }, '50%': { transform: 'translateY(-8px) rotate(-6deg)' } },
        }}>
          <Typography sx={{ position: 'absolute', top: '8%',  left: '55%', fontSize: '2rem',   animation: 'float-a 4.2s ease-in-out infinite' }}>🌸</Typography>
          <Typography sx={{ position: 'absolute', top: '28%', left: '20%', fontSize: '1.4rem', animation: 'float-b 5.1s ease-in-out infinite' }}>✨</Typography>
          <Typography sx={{ position: 'absolute', top: '50%', left: '65%', fontSize: '1.6rem', animation: 'float-c 3.8s ease-in-out infinite' }}>🌷</Typography>
          <Typography sx={{ position: 'absolute', top: '70%', left: '30%', fontSize: '1.2rem', animation: 'float-a 4.8s ease-in-out infinite 0.5s' }}>💫</Typography>
          <Typography sx={{ position: 'absolute', top: '88%', left: '60%', fontSize: '1.5rem', animation: 'float-b 5.5s ease-in-out infinite 1s' }}>🌺</Typography>
        </Box>

        {/* Right decorations */}
        <Box sx={{
          display: { xs: 'none', lg: 'block' },
          position: 'absolute', right: 0, top: 0, bottom: 0,
          width: 'calc((100% - 680px) / 2)',
          pointerEvents: 'none',
        }}>
          <Typography sx={{ position: 'absolute', top: '5%',  right: '50%', fontSize: '1.5rem', animation: 'float-b 4.6s ease-in-out infinite 0.3s' }}>🦋</Typography>
          <Typography sx={{ position: 'absolute', top: '25%', right: '20%', fontSize: '1.8rem', animation: 'float-c 5.0s ease-in-out infinite' }}>🌟</Typography>
          <Typography sx={{ position: 'absolute', top: '48%', right: '55%', fontSize: '1.3rem', animation: 'float-a 3.9s ease-in-out infinite 0.7s' }}>💕</Typography>
          <Typography sx={{ position: 'absolute', top: '68%', right: '25%', fontSize: '1.6rem', animation: 'float-b 4.3s ease-in-out infinite' }}>🌸</Typography>
          <Typography sx={{ position: 'absolute', top: '85%', right: '50%', fontSize: '1.2rem', animation: 'float-c 5.2s ease-in-out infinite 1.2s' }}>✨</Typography>
        </Box>

        <Box sx={{ maxWidth: 680, mx: 'auto', width: '100%' }}>
          <TodoList onXpEarned={addBonusXp} />
        </Box>
      </Box>

      {/* ── Pinned Decks Section ── */}
      <Box sx={{ mb: 5 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="h5" sx={{ color: 'text.primary', fontWeight: 800 }}>
            📚 Decks
          </Typography>
          <Button
            size="small"
            variant="text"
            onClick={() => router.push('/decks')}
            sx={{ fontSize: '0.78rem', color: 'text.secondary' }}
          >
            Manage all decks →
          </Button>
        </Stack>

        {pinnedDecks.length === 0 ? (
          <Box
            onClick={() => router.push('/decks')}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2.5,
              p: { xs: 2.5, sm: 3 },
              borderRadius: 3,
              border: '1.5px dashed rgba(249,168,212,0.4)',
              bgcolor: 'rgba(255,243,249,0.7)',
              cursor: 'pointer',
              transition: 'all 0.18s ease',
              '&:hover': { bgcolor: 'rgba(255,236,246,0.9)', borderColor: 'rgba(244,114,182,0.55)' },
            }}
          >
            <Typography sx={{ fontSize: '2.2rem', flexShrink: 0 }}>📌</Typography>
            <Box>
              <Typography variant="body1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                {decks.length === 0 ? 'Create your first deck!' : 'Pin a deck to see it here'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {decks.length === 0
                  ? 'Head to Decks to start building flashcards ✨'
                  : 'Open Decks and tap the pin icon on any deck ✨'}
              </Typography>
            </Box>
          </Box>
        ) : (
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
        )}
      </Box>

      {/* ── Pinned Speeches Section ── */}
      <Box>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="h5" sx={{ color: 'text.primary', fontWeight: 800 }}>
            ✨ Speech Practice
          </Typography>
          <Button
            size="small"
            variant="text"
            onClick={() => router.push('/ohanashikai')}
            sx={{ fontSize: '0.78rem', color: 'text.secondary' }}
          >
            Manage speeches →
          </Button>
        </Stack>

        {pinnedSpeeches.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2.5,
              p: { xs: 2.5, sm: 3 },
              borderRadius: 3,
              border: '1.5px dashed rgba(249,168,212,0.4)',
              bgcolor: 'rgba(255,243,249,0.7)',
              cursor: 'pointer',
              transition: 'all 0.18s ease',
              '&:hover': { bgcolor: 'rgba(255,236,246,0.9)', borderColor: 'rgba(244,114,182,0.55)' },
            }}
            onClick={() => router.push('/ohanashikai')}
          >
            <Typography sx={{ fontSize: '2.2rem', flexShrink: 0 }}>🌸</Typography>
            <Box>
              <Typography variant="body1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                {ohanashikais.length === 0 ? 'Practice your お話し会 speech!' : 'Pin a speech to see it here'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {ohanashikais.length === 0
                  ? 'Add your lines and start memorizing — tap to get started ✨'
                  : 'Open Speeches and tap the pin icon on any speech ✨'}
              </Typography>
            </Box>
          </Box>
        ) : (
          <Stack spacing={1.5}>
            {pinnedSpeeches.map((item, i) => {
              const cardEmojis = ['🌸', '✨', '🌟', '💫', '🎀'];
              const emoji = cardEmojis[i % cardEmojis.length];
              return (
                <Box
                  key={item.id}
                  onClick={() => router.push(`/ohanashikai/${item.id}`)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    p: { xs: 1.75, sm: 2 },
                    borderRadius: 3,
                    bgcolor: '#FFFFFF',
                    border: '1.5px solid rgba(249,168,212,0.3)',
                    boxShadow: '0 2px 10px rgba(249,168,212,0.1)',
                    transition: 'all 0.18s ease',
                    cursor: 'pointer',
                    '&:hover': { boxShadow: '0 5px 20px rgba(249,168,212,0.2)', transform: 'translateY(-1px)' },
                  }}
                >
                  <Typography sx={{ fontSize: '1.4rem', flexShrink: 0 }}>{emoji}</Typography>
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography variant="body1" sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1.2 }} noWrap>
                      {item.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.lineCount} line{item.lineCount !== 1 ? 's' : ''}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </Stack>
        )}
      </Box>

      <ShareDeckDialog
        open={shareDeckId !== null}
        onClose={() => setShareDeckId(null)}
        deckId={shareDeckId ?? ''}
        deckName={shareDeckName}
      />
    </Box>
  );
}
