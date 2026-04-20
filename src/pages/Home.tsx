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
import StorefrontIcon from '@mui/icons-material/Storefront';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useProgress, xpProgressInLevel } from '@/hooks/useProgress';
import { useOhanashikais } from '@/hooks/useOhanashikais';
import { SHOP_ITEMS, useShop } from '@/hooks/useShop';
import { PageHeader } from '@/components/PageHeader';

function getGreeting(name: string): { text: string; emoji: string } {
  const h = new Date().getHours();
  if (h < 12) return { text: `Good morning, ${name}!`, emoji: '🌸' };
  if (h < 17) return { text: `Hey there, ${name}!`,    emoji: '☀️' };
  return           { text: `Good evening, ${name}!`,   emoji: '🌙' };
}

function WelcomeBanner({ username, level, streak, totalXp, spendableXp, ownedItemKeys, onShopClick }: {
  username: string; level: number; streak: number; totalXp: number;
  spendableXp: number; ownedItemKeys: string[]; onShopClick: () => void;
}) {
  const { text, emoji } = getGreeting(username);
  const { current, needed } = xpProgressInLevel(totalXp);
  const pct = Math.round((current / needed) * 100);
  const theme = useTheme();
  const { brand, accent } = theme.palette;

  const nextItem = SHOP_ITEMS
    .filter((i) => i.price > 0 && !ownedItemKeys.includes(i.key))
    .sort((a, b) => a.price - b.price)[0] ?? null;
  const xpNeeded = nextItem ? Math.max(0, nextItem.price - spendableXp) : 0;

  return (
    <PageHeader
      emoji={emoji}
      title={text}
      gradientTitle
      endContent={
        <Box
          role="button"
          onClick={onShopClick}
          sx={{
            minWidth: { sm: 220 },
            width: { xs: '100%', sm: 260 },
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            '& *': { pointerEvents: 'none' },
            '&:hover': { opacity: 0.85 },
            '@keyframes shimmer': {
              '0%': { backgroundPosition: '-200% 0' },
              '100%': { backgroundPosition: '200% 0' },
            },
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: brand[700] }}>XP Progress</Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, color: brand[600] }}>{current} / {needed}</Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={pct}
            sx={{
              height: 12,
              borderRadius: 6,
              bgcolor: alpha(brand[200], 0.5),
              '& .MuiLinearProgress-bar': {
                borderRadius: 6,
                background: `linear-gradient(90deg, ${brand[400]}, ${accent[400]}, ${brand[300]}, ${accent[400]}, ${brand[400]})`,
                backgroundSize: '200% 100%',
                animation: 'shimmer 3s ease-in-out infinite',
                transition: 'width 0.6s ease',
              },
            }}
          />
          <Typography variant="caption" sx={{ color: brand[600], fontWeight: 600, mt: 0.5, display: 'block' }}>
            {needed - current} XP to level {level + 1} 🚀
          </Typography>

          <Box sx={{ mt: 1, pt: 1, borderTop: `1px solid ${alpha(brand[300], 0.25)}` }}>
            <Stack direction="row" alignItems="center" spacing={0.5} mb={nextItem ? 0.5 : 0}>
              <AutoAwesomeIcon sx={{ fontSize: '0.85rem', color: accent[500] }} />
              <Typography variant="caption" sx={{ fontWeight: 800, color: accent[600] }}>
                {spendableXp.toLocaleString()} XP to spend
              </Typography>
              <StorefrontIcon sx={{ fontSize: '0.85rem', color: brand[500], ml: 'auto' }} />
            </Stack>
            {nextItem && xpNeeded > 0 && (
              <Typography variant="caption" sx={{ color: brand[500], fontWeight: 600, fontSize: '0.7rem', display: 'block' }}>
                {nextItem.emoji} {nextItem.name} — {xpNeeded.toLocaleString()} more XP!
              </Typography>
            )}
          </Box>
        </Box>
      }
    >
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
    </PageHeader>
  );
}

export default function Home() {
  const { decks, deleteDeck, updateDeckEmoji, pinDeck, loading } = useDecks();
  const { user, displayName } = useAuth();
  const { progress, spendableXp, addBonusXp } = useProgress();
  const { ohanashikais } = useOhanashikais();
  const { purchases } = useShop();
  const router = useRouter();
  const ownedItemKeys = purchases.map((p) => p.item_key);

  const [shareDeckId, setShareDeckId] = useState<string | null>(null);
  const [shareDeckName, setShareDeckName] = useState('');

  const username = displayName ?? user?.email?.split('@')[0] ?? 'there';
  const isOwner = (deck: { ownerId: string }) => deck.ownerId === user?.id;

  const pinnedDecks = decks.filter((d) => d.pinned);
  const pinnedSpeeches = ohanashikais.filter((o) => o.pinned);

  if (loading) {
    return (
      <Box sx={{ maxWidth: 1440, mx: 'auto', px: { xs: 2, sm: 4, lg: 6 }, py: 6 }}>
        <Loading message="Loading your decks…" />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1440, mx: 'auto', px: { xs: 2, sm: 4, lg: 6 }, py: { xs: 3, sm: 5 } }}>
      {/* Welcome banner — constrained to match other page headers */}
      {progress && (
        <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
          <WelcomeBanner
            username={username}
            level={progress.level}
            streak={progress.streak_days}
            totalXp={progress.total_xp}
            spendableXp={spendableXp}
            ownedItemKeys={ownedItemKeys}
            onShopClick={() => router.push('/shop')}
          />
        </Box>
      )}

      {/* ── Main content: two-column on md+, stacked on mobile ── */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={{ xs: 3, md: 4 }}
        alignItems="flex-start"
      >
        {/* Left column — To-Do List */}
        <Box sx={{ width: { xs: '100%', md: '50%', lg: '45%' }, flexShrink: 0 }}>
          <TodoList onXpEarned={addBonusXp} />
        </Box>

        {/* Right column — Pinned Decks & Speeches */}
        <Box sx={{ width: { xs: '100%', md: '50%', lg: '55%' }, minWidth: 0 }}>
          {/* ── Pinned Decks ── */}
          <Box sx={{ mb: 3 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
              <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 800 }}>
                📚 Decks
              </Typography>
              <Button
                size="small"
                variant="text"
                onClick={() => router.push('/decks')}
                sx={{ fontSize: '0.75rem', color: 'text.secondary' }}
              >
                All decks →
              </Button>
            </Stack>

            {pinnedDecks.length === 0 ? (
              <Box
                onClick={() => router.push('/decks')}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  p: 2,
                  borderRadius: 3,
                  border: (t) => `1.5px dashed ${alpha(t.palette.brand[300], 0.4)}`,
                  bgcolor: (t) => alpha(t.palette.brand[50], 0.7),
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  '&:hover': {
                    bgcolor: (t) => alpha(t.palette.brand[100], 0.9),
                    borderColor: (t) => alpha(t.palette.brand[400], 0.55),
                  },
                }}
              >
                <Typography sx={{ fontSize: '1.8rem', flexShrink: 0 }}>📌</Typography>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    {decks.length === 0 ? 'Create your first deck!' : 'Pin a deck to see it here'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {decks.length === 0
                      ? 'Head to Decks to start building flashcards ✨'
                      : 'Tap the pin icon on any deck ✨'}
                  </Typography>
                </Box>
              </Box>
            ) : (
              <Grid container spacing={1.5}>
                {pinnedDecks.map((deck) => {
                  const owned = isOwner(deck);
                  return (
                    <Grid size={{ xs: 12, sm: 6 }} key={deck.id}>
                      <DeckCard
                        deck={deck}
                        onOpen={(id) => router.push(`/deck/${id}?from=home`)}
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

          {/* ── Pinned Speeches ── */}
          <Box>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
              <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 800 }}>
                ✨ Speech Practice
              </Typography>
              <Button
                size="small"
                variant="text"
                onClick={() => router.push('/ohanashikai')}
                sx={{ fontSize: '0.75rem', color: 'text.secondary' }}
              >
                All speeches →
              </Button>
            </Stack>

            {pinnedSpeeches.length === 0 ? (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  p: 2,
                  borderRadius: 3,
                  border: (t) => `1.5px dashed ${alpha(t.palette.brand[300], 0.4)}`,
                  bgcolor: (t) => alpha(t.palette.brand[50], 0.7),
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  '&:hover': {
                    bgcolor: (t) => alpha(t.palette.brand[100], 0.9),
                    borderColor: (t) => alpha(t.palette.brand[400], 0.55),
                  },
                }}
                onClick={() => router.push('/ohanashikai')}
              >
                <Typography sx={{ fontSize: '1.8rem', flexShrink: 0 }}>🌸</Typography>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    {ohanashikais.length === 0 ? 'Practice your お話し会 speech!' : 'Pin a speech to see it here'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {ohanashikais.length === 0
                      ? 'Add your lines and start memorizing ✨'
                      : 'Tap the pin icon on any speech ✨'}
                  </Typography>
                </Box>
              </Box>
            ) : (
              <Stack spacing={1}>
                {pinnedSpeeches.map((item, i) => {
                  const cardEmojis = ['🌸', '✨', '🌟', '💫', '🎀'];
                  const emoji = cardEmojis[i % cardEmojis.length];
                  return (
                    <Box
                      key={item.id}
                      onClick={() => router.push(`/ohanashikai/${item.id}?from=home`)}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        p: 1.5,
                        borderRadius: 3,
                        bgcolor: 'background.paper',
                        border: (t) => `1.5px solid ${alpha(t.palette.brand[300], 0.3)}`,
                        boxShadow: (t) => `0 2px 10px ${alpha(t.palette.brand[300], 0.1)}`,
                        transition: 'all 0.18s ease',
                        cursor: 'pointer',
                        '&:hover': {
                          boxShadow: (t) => `0 5px 20px ${alpha(t.palette.brand[300], 0.2)}`,
                          transform: 'translateY(-1px)',
                        },
                      }}
                    >
                      <Typography sx={{ fontSize: '1.2rem', flexShrink: 0 }}>{emoji}</Typography>
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1.2 }} noWrap>
                          {item.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                          {item.lineCount} line{item.lineCount !== 1 ? 's' : ''}
                        </Typography>
                      </Box>
                    </Box>
                  );
                })}
              </Stack>
            )}
          </Box>
        </Box>
      </Stack>

      <ShareDeckDialog
        open={shareDeckId !== null}
        onClose={() => setShareDeckId(null)}
        deckId={shareDeckId ?? ''}
        deckName={shareDeckName}
      />
    </Box>
  );
}
