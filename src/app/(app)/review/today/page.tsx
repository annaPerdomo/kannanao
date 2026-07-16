'use client';
import { Box, Button, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { Loading } from '@/components/Loading';
import { ReviewQuest } from '@/components/ReviewQuest';
import { useAuth } from '@/contexts/AuthContext';
import { getDueCards } from '@/lib/supabase';
import { LAYOUT } from '@/theme';
import type { Flashcard } from '@/types/flashcard';

/** Shown when nothing is due — calm, encouraging, points back to practice. */
function AllDone({ onGames, onHome }: { onGames: () => void; onHome: () => void }) {
  const t = useTranslations('Review.todayPage');
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
        {t('allDoneTitle')}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 4 }}>
        {t('allDoneBody')}
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
          {t('playAGame')}
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
          {t('backHome')}
        </Button>
      </Stack>
    </Box>
  );
}

/**
 * Today's practice, presented as a short quest. Pulls the cards due right now
 * across ALL the student's decks and hands them to <ReviewQuest>, which sizes
 * the node path (Warm-up → Word Match → Boss Round), runs it inside one review
 * session, and ends with the perfect bonus + daily chest. Only cards graded at
 * least once ever become due (see getDueCards), so this never floods day one.
 */
export default function ReviewTodayPage() {
  const t = useTranslations('Review.todayPage');
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

  if (cards === null) {
    return (
      <Box sx={{ maxWidth: LAYOUT.narrowMaxWidth, mx: 'auto', px: LAYOUT.pagePx, py: 6 }}>
        <Loading message={t('findingReviews')} />
      </Box>
    );
  }

  if (cards.length === 0) {
    return <AllDone onGames={() => router.push('/review')} onHome={() => router.push('/')} />;
  }

  return <ReviewQuest cards={cards} onExit={() => router.push('/review')} />;
}
