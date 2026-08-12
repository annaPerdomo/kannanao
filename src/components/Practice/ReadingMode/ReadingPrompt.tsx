'use client';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { Box, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';

import { SpeakButton } from '@/components/SpeakButton';
import { speakTextFor } from '@/lib/flashcardUtils';
import type { Flashcard } from '@/types/flashcard';

interface ReadingPromptProps {
  card: Flashcard;
  result: 'correct' | 'wrong' | null;
}

/**
 * The kanji prompt and, once answered, the reveal: reading, meaning and audio.
 * Nothing here shows furigana before the answer — that would be the answer.
 */
export function ReadingPrompt({ card, result }: ReadingPromptProps) {
  const theme = useTheme();
  const { brand, surfaces } = theme.palette;
  const t = useTranslations('Practice.readingMode');
  const tCommon = useTranslations('Practice.common');

  return (
    <>
      <Box
        sx={{
          border: '2px solid',
          borderColor: result
            ? result === 'correct'
              ? 'success.main'
              : 'error.main'
            : alpha(brand[300], 0.45),
          borderRadius: 3,
          p: 3,
          mb: 3,
          textAlign: 'center',
          bgcolor: surfaces.input,
          boxShadow: `0 8px 24px ${alpha(brand[300], 0.12)}`,
          transition: 'border-color 0.25s',
        }}
      >
        <Typography
          variant="caption"
          sx={{ color: 'primary.main', letterSpacing: '0.12em', display: 'block', mb: 1.5 }}
        >
          {t('readPrompt')}
        </Typography>
        <Typography
          sx={{
            fontFamily: (th) => th.fonts.jp,
            fontSize: { xs: '3rem', sm: '3.6rem' },
            fontWeight: 700,
            lineHeight: 1.2,
            color: 'text.primary',
          }}
        >
          {card.word}
        </Typography>

        {result && (
          <Box sx={{ mt: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
              <Typography
                sx={{ fontFamily: (th) => th.fonts.jp, fontSize: '1.6rem', fontWeight: 700 }}
              >
                {card.reading}
              </Typography>
              <SpeakButton text={speakTextFor(card)} iconSize="1.1rem" />
            </Box>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              {card.meaning}
            </Typography>
          </Box>
        )}
      </Box>

      {result && (
        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            border: '1px solid',
            borderColor: result === 'correct' ? 'success.main' : 'error.main',
            bgcolor:
              result === 'correct'
                ? alpha(theme.palette.success.main, 0.1)
                : alpha(theme.palette.error.main, 0.08),
            mb: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          {result === 'correct' ? (
            <CheckIcon sx={{ color: 'success.main' }} />
          ) : (
            <CloseIcon sx={{ color: 'error.main' }} />
          )}
          <Typography
            variant="body2"
            color={result === 'correct' ? 'success.main' : 'error.main'}
            sx={{ flexGrow: 1 }}
          >
            {result === 'correct'
              ? tCommon('correctMovingOn')
              : t('incorrectAnswer', { reading: card.reading })}
          </Typography>
        </Box>
      )}
    </>
  );
}
