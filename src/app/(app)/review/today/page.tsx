'use client';
import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

import { Loading } from '@/components/Loading';
import { ReviewQuest } from '@/components/ReviewQuest';
import { useAuth } from '@/contexts/AuthContext';
import { useKanaProgress } from '@/hooks/useKanaProgress';
import { KANA_MAX_DUE, KANA_WAIT_MS, pickQuestKana, planQuest } from '@/lib/quest';
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
 * across ALL the student's decks — plus the few characters the reading queue
 * says are slipping — and hands them to <ReviewQuest>. Only cards graded at
 * least once ever become due (see getDueCards), so this never floods day one.
 */
export default function ReviewTodayPage() {
  const t = useTranslations('Review.todayPage');
  const router = useRouter();
  const { user } = useAuth();
  const { byKana, error: kanaError, record: recordKana } = useKanaProgress();
  const [cards, setCards] = useState<Flashcard[] | null>(null);
  const [kanaChars, setKanaChars] = useState<string[] | null>(null);
  const [error, setError] = useState(false);
  // Bumped by the retry button; re-runs the fetch effect.
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => {
    setError(false);
    setCards(null);
    setAttempt((a) => a + 1);
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getDueCards(user.id)
      .then((due) => {
        if (!cancelled) setCards(due);
      })
      .catch(() => {
        // An empty array must mean "nothing due", never "the fetch failed" —
        // otherwise an outage renders the 🎉 all-done celebration.
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user, attempt]);

  // Picked ONCE: a fresh array per render reshuffles the drills mid-node. A
  // failed, slow or irrelevant read means no characters, never a blocked queue.
  useEffect(() => {
    if (kanaChars !== null) return;
    // kanaNodeSize drops the node at this size anyway — nothing to wait for.
    if (cards !== null && cards.length > KANA_MAX_DUE) {
      setKanaChars([]);
      return;
    }
    if (byKana) {
      setKanaChars(pickQuestKana(byKana));
      return;
    }
    if (kanaError) {
      setKanaChars([]);
      return;
    }
    const timer = setTimeout(() => setKanaChars([]), KANA_WAIT_MS);
    return () => clearTimeout(timer);
  }, [byKana, kanaError, kanaChars, cards]);

  if (error) {
    return (
      <Box
        sx={{
          maxWidth: LAYOUT.narrowMaxWidth,
          mx: 'auto',
          px: LAYOUT.pagePx,
          py: { xs: 3, sm: 6 },
        }}
      >
        <Alert
          severity="error"
          sx={{ borderRadius: 3 }}
          action={
            <Button color="inherit" size="small" onClick={retry}>
              {t('retry')}
            </Button>
          }
        >
          {t('loadError')}
        </Alert>
      </Box>
    );
  }

  if (cards === null || kanaChars === null) {
    return (
      <Box
        sx={{
          maxWidth: LAYOUT.narrowMaxWidth,
          mx: 'auto',
          px: LAYOUT.pagePx,
          py: { xs: 3, sm: 6 },
        }}
      >
        <Loading message={t('findingReviews')} />
      </Box>
    );
  }

  // Not cards.length: "all caught up" has to mean the characters too.
  if (planQuest(cards, kanaChars).nodes.length === 0) {
    return <AllDone onGames={() => router.push('/review')} onHome={() => router.push('/')} />;
  }

  return (
    <ReviewQuest
      cards={cards}
      kanaChars={kanaChars}
      recordKana={recordKana}
      onExit={() => router.push('/review')}
    />
  );
}
