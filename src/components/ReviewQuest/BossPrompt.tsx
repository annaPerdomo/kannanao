'use client';

import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { Box, Grid, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';

import { SpeakButton } from '@/components/SpeakButton';
import TitleFurigana from '@/components/TitleFurigana';
import { getFlashcardDisplayText, speakTextFor, titleFontSize } from '@/lib/flashcardUtils';
import type { Flashcard } from '@/types/flashcard';

const CHOICE_LABELS = ['A', 'B', 'C', 'D'];

interface BossPromptProps {
  card: Flashcard;
  choices: string[];
  selected: string | null;
  masked: boolean;
  onSelect: (choice: string) => void;
}

export function BossPrompt({ card, choices, selected, masked, onSelect }: BossPromptProps) {
  const theme = useTheme();
  const { brand, surfaces } = theme.palette;
  const t = useTranslations('Review.bossRound');
  const display = getFlashcardDisplayText(card);

  return (
    <>
      {/* Prompt word — takes the slack so the choices below never leave the
          fold. Grow-only (`1 0 auto`): it clips its overflow, so shrinking
          would cut the word in half instead of scrolling. */}
      <Box
        sx={{
          flex: '1 0 auto',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          textAlign: 'center',
          p: 3,
          mb: 2,
          borderRadius: 3,
          border: `2px solid ${alpha(brand[300], 0.4)}`,
          bgcolor: surfaces.input,
          overflow: 'hidden',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
          <Typography
            sx={{
              fontFamily: (t) => t.fonts.jp,
              fontSize:
                card.cardType === 'phrase'
                  ? { xs: '2.1rem', sm: '3rem' }
                  : {
                      xs: titleFontSize(display.titleText, 2.1, 1.1),
                      sm: titleFontSize(display.titleText, 3.2, 1.4),
                    },
              fontWeight: 700,
              color: 'text.primary',
              whiteSpace: card.cardType === 'phrase' ? undefined : 'nowrap',
            }}
          >
            {display.titleFurigana ? (
              <TitleFurigana markup={display.titleFurigana} masked={masked} />
            ) : (
              display.titleText
            )}
          </Typography>
          <SpeakButton text={speakTextFor(card)} iconSize="1.3rem" />
        </Box>
        {display.subtitleText && !display.titleFurigana && (
          <Typography variant="body2" color="text.secondary">
            {display.subtitleText}
          </Typography>
        )}
        <Typography
          variant="caption"
          sx={{ color: 'text.secondary', letterSpacing: '0.12em', display: 'block', mt: 1 }}
        >
          {t('whatDoesThisMean')}
        </Typography>
      </Box>

      <Grid container spacing={1.5} sx={{ flexShrink: 0 }}>
        {choices.map((choice, i) => {
          const isCorrect = choice === card.meaning;
          const isSelected = selected === choice;
          let borderColor: string = alpha(brand[200], 0.7);
          let bgcolor: string = surfaces.input;
          let icon: React.ReactNode = null;
          if (selected) {
            if (isCorrect) {
              borderColor = theme.palette.success.main;
              bgcolor = alpha(theme.palette.success.main, 0.1);
              icon = <CheckIcon sx={{ color: 'success.main', flexShrink: 0 }} />;
            } else if (isSelected) {
              borderColor = theme.palette.error.main;
              bgcolor = alpha(theme.palette.error.main, 0.08);
              icon = <CloseIcon sx={{ color: 'error.main', flexShrink: 0 }} />;
            }
          }
          return (
            <Grid size={{ xs: 12, sm: 6 }} key={choice}>
              <Box
                role="button"
                tabIndex={selected ? -1 : 0}
                aria-label={choice}
                onClick={() => onSelect(choice)}
                onKeyDown={(e) => {
                  if (!selected && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    onSelect(choice);
                  }
                }}
                sx={{
                  p: 2,
                  border: '2px solid',
                  borderRadius: 2,
                  cursor: selected ? 'default' : 'pointer',
                  borderColor,
                  bgcolor,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  minHeight: 60,
                  transition: 'all 0.2s',
                  '&:hover': !selected
                    ? { borderColor: brand[500], bgcolor: alpha(brand[300], 0.15) }
                    : {},
                }}
              >
                {icon ?? (
                  <Box
                    sx={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      border: `2px solid ${alpha(brand[300], 0.4)}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                      {CHOICE_LABELS[i]}
                    </Typography>
                  </Box>
                )}
                <Typography sx={{ color: 'text.primary', flexGrow: 1 }}>{choice}</Typography>
              </Box>
            </Grid>
          );
        })}
      </Grid>
    </>
  );
}
