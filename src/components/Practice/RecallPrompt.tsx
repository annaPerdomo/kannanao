'use client';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import FuriganaText, { furiganaToKana } from '@/components/FuriganaText';
import { SpeakButton } from '@/components/SpeakButton';
import TitleFurigana from '@/components/TitleFurigana';
import { UnsplashAttribution } from '@/components/UnsplashAttribution';
import { getFlashcardDisplayText, titleFontSize } from '@/lib/flashcardUtils';
import type { Flashcard } from '@/types/flashcard';

import { ChoiceGrid } from './ChoiceGrid';

interface RecallPromptProps {
  card: Flashcard;
  choices: string[];
  selected: string | null;
  masked: boolean;
  imageReady: boolean;
  holdForReplay: boolean;
  isLast: boolean;
  onSelect: (choice: string) => void;
  onSpeak: () => void;
  onNext: () => void;
}

export function RecallPrompt({
  card,
  choices,
  selected,
  masked,
  imageReady,
  holdForReplay,
  isLast,
  onSelect,
  onSpeak,
  onNext,
}: RecallPromptProps) {
  const t = useTranslations('Practice.recallMode');
  const tCommon = useTranslations('Practice.common');
  const theme = useTheme();
  const { brand, surfaces } = theme.palette;
  const display = getFlashcardDisplayText(card);
  const answeredCorrectly = selected === card.meaning;

  return (
    <>
      {/* Word card — takes the height the choices below don't need, so the
          answer image can appear without pushing anything off screen. Grow-only
          (`1 0 auto`): it clips its overflow, so shrinking would cut off the
          word rather than scroll the page. */}
      <Box
        sx={{
          position: 'relative',
          flex: '1 0 auto',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          border: '2px solid',
          borderColor: selected ? 'success.main' : alpha(brand[300], 0.45),
          borderRadius: 3,
          overflow: 'hidden',
          mb: { xs: 1.5, sm: 2 },
          boxShadow: `0 8px 24px ${alpha(brand[300], 0.12)}`,
          transition: 'border-color 0.25s',
        }}
      >
        {/* Image and example sentence would give the meaning away, so they only
            appear after answering, as feedback that reinforces the word. The
            image fills what the card has left, down to a floor below which it
            reads as a smear rather than a picture. */}
        {selected && card.imageUrl && imageReady && (
          <Box sx={{ position: 'relative', flex: 1, minHeight: { xs: 120, sm: 160 } }}>
            <Box
              component="img"
              src={card.imageUrl}
              alt={card.word}
              sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
            <UnsplashAttribution url={card.imageUrl} />
          </Box>
        )}
        <Box
          sx={{
            flexShrink: 0,
            p: { xs: 1.5, sm: 2 },
            textAlign: 'center',
            bgcolor: surfaces.input,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
            <Typography
              sx={{
                fontFamily: (t) => t.fonts.jp,
                fontSize:
                  card.cardType === 'phrase'
                    ? { xs: '2.2rem', sm: '3rem' }
                    : {
                        xs: titleFontSize(display.titleText, 2.2, 1.1),
                        sm: titleFontSize(display.titleText, 3.2, 1.4),
                      },
                fontWeight: 700,
                color: 'text.primary',
                mb: 0.5,
                whiteSpace: card.cardType === 'phrase' ? undefined : 'nowrap',
              }}
            >
              {display.titleFurigana ? (
                <TitleFurigana markup={display.titleFurigana} masked={masked} />
              ) : (
                display.titleText
              )}
            </Typography>
            <SpeakButton
              text={display.speakText}
              iconSize="1.4rem"
              onSpeak={selected ? onSpeak : undefined}
              sx={{ mb: 0.5 }}
            />
          </Box>
          {display.subtitleText && !display.titleFurigana && (
            <Typography variant="body1" color="text.secondary">
              {display.subtitleText}
            </Typography>
          )}
          {selected && card.example_jp && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.5,
                mt: 1,
              }}
            >
              <FuriganaText
                text={card.example_jp}
                showFurigana
                sx={{
                  color: 'text.secondary',
                  fontFamily: (t) => t.fonts.jp,
                  fontSize: '0.9rem',
                }}
              />
              <SpeakButton
                text={furiganaToKana(card.example_jp)}
                iconSize="1.1rem"
                onSpeak={onSpeak}
              />
            </Box>
          )}
          {!selected && (
            <Typography
              variant="caption"
              sx={{ color: 'text.secondary', letterSpacing: '0.12em', display: 'block', mt: 1.5 }}
            >
              {t('whatDoesThisMean')}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Answer choices */}
      <Box sx={{ flexShrink: 0 }}>
        <ChoiceGrid
          choices={choices}
          correct={card.meaning}
          selected={selected}
          onSelect={onSelect}
        />
      </Box>

      {holdForReplay && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1, flexShrink: 0 }}>
          <Button variant="contained" onClick={onNext} size="large">
            {isLast ? t('seeResults') : t('nextArrow')}
          </Button>
        </Box>
      )}
      {answeredCorrectly && !holdForReplay && (
        <Box sx={{ textAlign: 'center', mb: 1, flexShrink: 0 }}>
          <Typography variant="body2" color="success.main" sx={{ fontStyle: 'italic' }}>
            {tCommon('correctMovingOn')}
          </Typography>
        </Box>
      )}
    </>
  );
}
