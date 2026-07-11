'use client';
import { Box, Button, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import FlipStudy from '@/components/FlipStudy';
import { useAuth } from '@/contexts/AuthContext';
import { getDueCards } from '@/lib/supabase';
import { LAYOUT } from '@/theme';
import type { Flashcard } from '@/types/flashcard';

/** Shown when nothing is due — calm, encouraging, points back to practice. */
function AllDone({ onGames, onHome }: { onGames: () => void; onHome: () => void }) {
  return (
    <Box
      sx={{
        maxWidth: LAYOUT.narrowMaxWidth,
        mx: 'auto',
        px: LAYOUT.pagePx,
        py: 8,
        textAlign: 'center',
      }}
    >
      <Typography sx={{ fontSize: '3.5rem', mb: 1 }}>🎉</Typography>
      <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', mb: 1 }}>
        All done for today!
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 4 }}>
        You&apos;ve reviewed everything that came due. Play a game to keep the streak going ✨
      </Typography>
      <Stack direction="row" spacing={2} justifyContent="center">
        <Button
          variant="contained"
          onClick={onGames}
          sx={{
            borderRadius: 3,
            px: 3,
            background: (t) =>
              `linear-gradient(135deg, ${t.palette.brand[600]} 0%, ${t.palette.accent[600]} 100%)`,
            '&:hover': {
              background: (t) =>
                `linear-gradient(135deg, ${t.palette.brand[700]} 0%, ${t.palette.accent[700]} 100%)`,
            },
          }}
        >
          Play a game
        </Button>
        <Button
          variant="outlined"
          onClick={onHome}
          sx={{
            borderRadius: 3,
            px: 3,
            borderColor: (t) => alpha(t.palette.brand[400], 0.5),
            color: (t) => t.palette.brand[600],
          }}
        >
          Back home
        </Button>
      </Stack>
    </Box>
  );
}

/**
 * Today's practice (the flip-with-self-grading flow): pulls the cards due right
 * now across ALL the student's decks and runs them through the shared FlipStudy
 * component. Only cards graded at least once ever become due (see getDueCards),
 * so this never floods on day one. Grading here advances each card's schedule
 * via the SRS scheduler — exactly like the card-based games. Reached from the
 * /review hub's "Start today's practice" button.
 */
export default function ReviewTodayPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [cards, setCards] = useState<Flashcard[] | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void getDueCards(user.id).then((due) => {
      if (!cancelled) setCards(due);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <FlipStudy
      cards={cards ?? []}
      loading={cards === null}
      loadingMessage="Finding your reviews…"
      title="Today's Practice"
      badge={cards && cards.length > 0 ? `${cards.length} to review` : undefined}
      sessionMode="review"
      sessionDeckId={null}
      onBack={() => router.push('/review')}
      completionSubheading="You reviewed everything that was due!"
      emptyState={
        <AllDone onGames={() => router.push('/review')} onHome={() => router.push('/')} />
      }
    />
  );
}
