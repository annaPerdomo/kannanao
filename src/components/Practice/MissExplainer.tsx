'use client';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { useEffect, useId, useRef } from 'react';

import FuriganaText, { furiganaToKana, titleRubySx } from '@/components/FuriganaText';
import { SpeakButton } from '@/components/SpeakButton';
import { getFlashcardDisplayText, speakTextFor, titleFontSize } from '@/lib/flashcardUtils';
import type { Flashcard } from '@/types/flashcard';

interface MissExplainerProps {
  card: Flashcard;
  /** Grammar rule shown above the sentence; EndingsMode passes the correct form's rule. */
  rule?: string;
  /** Overrides `card.imageUrl` — RecallMode only preloads the image once it has actually loaded. */
  imageUrl?: string;
  onContinue: () => void;
}

export function MissExplainer({ card, rule, imageUrl, onContinue }: MissExplainerProps) {
  const t = useTranslations('Practice.missExplainer');
  const theme = useTheme();
  const { brand, surfaces } = theme.palette;
  const display = getFlashcardDisplayText(card);
  const continueRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    continueRef.current?.focus();
  }, []);

  return (
    <Box
      role="region"
      aria-labelledby={titleId}
      sx={{
        flex: '1 0 auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        p: { xs: 2, sm: 3 },
        borderRadius: 3,
        border: `2px solid ${alpha(brand[300], 0.45)}`,
        bgcolor: surfaces.input,
        boxShadow: `0 8px 24px ${alpha(brand[300], 0.12)}`,
      }}
    >
      <Typography
        id={titleId}
        variant="h6"
        sx={{ fontWeight: 700, color: 'text.primary', mb: 1.5 }}
      >
        {t('title')}
      </Typography>

      {imageUrl && (
        <Box
          component="img"
          src={imageUrl}
          alt={card.word}
          sx={{
            width: { xs: 96, sm: 120 },
            height: { xs: 96, sm: 120 },
            objectFit: 'cover',
            borderRadius: 2,
            mb: 1.5,
          }}
        />
      )}

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
        <Typography
          sx={{
            fontFamily: (th) => th.fonts.jp,
            fontSize: titleFontSize(display.titleText, 2.4, 1.2),
            fontWeight: 700,
            color: 'text.primary',
          }}
        >
          {display.titleFurigana ? (
            <FuriganaText text={display.titleFurigana} showFurigana sx={titleRubySx} />
          ) : (
            display.titleText
          )}
        </Typography>
        <SpeakButton text={speakTextFor(card)} iconSize="1.3rem" />
      </Box>
      {display.subtitleText && !display.titleFurigana && (
        <Typography variant="body1" color="text.secondary">
          {display.subtitleText}
        </Typography>
      )}

      <Typography variant="body1" sx={{ fontWeight: 600, color: 'text.primary', mt: 1 }}>
        {card.meaning}
      </Typography>

      {rule && (
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
          {rule}
        </Typography>
      )}

      {card.example_jp && (
        <Box sx={{ mt: 2, width: '100%' }}>
          <Typography
            variant="caption"
            sx={{ color: 'text.secondary', letterSpacing: '0.1em', display: 'block', mb: 0.5 }}
          >
            {t('example')}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
            <FuriganaText
              text={card.example_jp}
              showFurigana
              sx={{ color: 'text.primary', fontFamily: (th) => th.fonts.jp, fontSize: '1rem' }}
            />
            <SpeakButton text={furiganaToKana(card.example_jp)} iconSize="1.1rem" />
          </Box>
          {card.example_en && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {card.example_en}
            </Typography>
          )}
        </Box>
      )}

      <Button
        ref={continueRef}
        variant="contained"
        size="large"
        onClick={onContinue}
        onKeyDown={(e) => {
          if (e.repeat) e.preventDefault();
        }}
        sx={{ mt: 3 }}
      >
        {t('continue')}
      </Button>
    </Box>
  );
}
