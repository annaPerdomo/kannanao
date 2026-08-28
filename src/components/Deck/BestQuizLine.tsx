'use client';
import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useEffect, useState } from 'react';

import { getBestQuizForDeck, type QuizScore } from '@/lib/supabase';

interface BestQuizLineProps {
  deckId: string;
}

/**
 * One quiet line showing the student's own best quiz score for this deck, e.g.
 * "Best quiz: 9/10". Renders nothing until a result exists — deliberately the
 * only quiz history a student sees on the deck page (teacher detail lives in
 * /group). RLS scopes the read to the current user.
 */
export function BestQuizLine({ deckId }: BestQuizLineProps) {
  const { brand } = useTheme().palette;
  const [best, setBest] = useState<QuizScore | null>(null);

  useEffect(() => {
    let active = true;
    // Degrades to hiding the line: one optional stat must not take the deck
    // page down with it, and there is nothing useful to say in its place.
    getBestQuizForDeck(deckId)
      .then((r) => {
        if (active) setBest(r);
      })
      .catch(() => {
        if (active) setBest(null);
      });
    return () => {
      active = false;
    };
  }, [deckId]);

  if (!best) return null;

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        px: 1.5,
        py: 0.5,
        mb: 2,
        borderRadius: 2,
        bgcolor: alpha(brand[100], 0.6),
        border: `1px solid ${alpha(brand[300], 0.4)}`,
      }}
    >
      <Typography aria-hidden sx={{ fontSize: '0.95rem' }}>
        📝
      </Typography>
      <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: brand[700] }}>
        Best quiz: {best.score}/{best.total}
      </Typography>
    </Box>
  );
}
