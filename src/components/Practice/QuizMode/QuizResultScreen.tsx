'use client';
import { Box, Button, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';

import { quizEncouragement, quizStars } from '@/lib/quiz';

interface QuizResultScreenProps {
  score: number;
  total: number;
  accuracy: number;
  onExit: () => void;
}

/**
 * The friendly finish screen for a quiz: a big score, 1–3 earned stars keyed to
 * accuracy, and one encouraging line. Deliberately celebratory and never
 * exam-anxious — to a student it reads like clearing any other practice mode.
 */
export function QuizResultScreen({ score, total, accuracy, onExit }: QuizResultScreenProps) {
  const theme = useTheme();
  const { brand, accent } = theme.palette;
  const stars = quizStars(accuracy);

  return (
    <Box
      sx={{
        textAlign: 'center',
        py: { xs: 5, sm: 7 },
        px: 3,
        borderRadius: 4,
        background: `linear-gradient(160deg, ${alpha(brand[100], 0.7)}, ${alpha(accent[100], 0.6)})`,
        border: `1.5px solid ${alpha(brand[300], 0.4)}`,
      }}
    >
      <Typography sx={{ fontSize: '3rem', mb: 1 }}>🎉</Typography>

      {/* Earned stars — filled up to `stars`, dim beyond */}
      <Box
        sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 2 }}
        role="img"
        aria-label={`${stars} out of 3 stars`}
      >
        {[1, 2, 3].map((n) => (
          <Box
            key={n}
            component="span"
            aria-hidden
            sx={{
              fontSize: { xs: '2.6rem', sm: '3.2rem' },
              lineHeight: 1,
              filter: n <= stars ? 'none' : 'grayscale(1)',
              opacity: n <= stars ? 1 : 0.3,
              transition: 'transform 0.2s',
              animation:
                n <= stars
                  ? `starPop 0.5s ${0.15 * n}s cubic-bezier(0.34,1.56,0.64,1) both`
                  : 'none',
              '@keyframes starPop': {
                from: { transform: 'scale(0) rotate(-30deg)', opacity: 0 },
                to: { transform: 'scale(1) rotate(0)', opacity: 1 },
              },
            }}
          >
            ⭐
          </Box>
        ))}
      </Box>

      <Typography sx={{ fontWeight: 900, fontSize: '2rem', color: brand[700], lineHeight: 1.1 }}>
        {score} / {total}
      </Typography>
      <Typography sx={{ fontSize: '1rem', color: 'text.secondary', mt: 0.5 }}>
        {accuracy}% correct
      </Typography>

      <Typography sx={{ fontSize: '1.05rem', fontWeight: 700, color: brand[600], mt: 2.5 }}>
        {quizEncouragement(stars)}
      </Typography>

      <Box sx={{ mt: 4 }}>
        <Button variant="contained" size="large" onClick={onExit} sx={{ px: 4, fontWeight: 800 }}>
          Back to Deck
        </Button>
      </Box>
    </Box>
  );
}
