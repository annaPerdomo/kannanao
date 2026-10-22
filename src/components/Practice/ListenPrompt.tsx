'use client';
import HeadphonesIcon from '@mui/icons-material/Headphones';
import ReplayIcon from '@mui/icons-material/Replay';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import { titleFontSize } from '@/lib/flashcardUtils';
import type { Flashcard } from '@/types/flashcard';

import { ChoiceGrid } from './ChoiceGrid';

interface ListenPromptProps {
  card: Flashcard;
  choices: string[];
  selected: string | null;
  unlocked: boolean;
  speaking: boolean;
  onSelect: (choice: string) => void;
  onPlay: () => void;
}

export function ListenPrompt({
  card,
  choices,
  selected,
  unlocked,
  speaking,
  onSelect,
  onPlay,
}: ListenPromptProps) {
  const theme = useTheme();
  const { brand, surfaces } = theme.palette;
  const t = useTranslations('Practice.listenMode');
  const tCommon = useTranslations('Practice.common');
  const answeredCorrectly = selected === card.meaning;

  return (
    <>
      {/* Sound card — the Japanese stays hidden until the question is answered.
          Takes the slack so revealing it never pushes the choices off screen.
          Grow-only (`1 0 auto`): it clips its overflow, so shrinking would hide
          the play button rather than scroll. */}
      <Box
        sx={{
          flex: '1 0 auto',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          border: '2px solid',
          borderColor: selected ? 'success.main' : alpha(brand[300], 0.45),
          borderRadius: 3,
          p: { xs: 1.5, sm: 2 },
          mb: { xs: 1.5, sm: 2 },
          textAlign: 'center',
          bgcolor: surfaces.input,
          boxShadow: `0 8px 24px ${alpha(brand[300], 0.12)}`,
          transition: 'border-color 0.25s',
          overflow: 'hidden',
        }}
      >
        <IconButton
          onClick={onPlay}
          aria-label={selected ? t('playWordAgainAria') : t('playWordAria')}
          sx={{
            width: { xs: 84, sm: 104 },
            height: { xs: 84, sm: 104 },
            mb: { xs: 1, sm: 1.5 },
            flexShrink: 0,
            alignSelf: 'center',
            color: 'primary.contrastText',
            background: `linear-gradient(135deg, ${brand[400]}, ${brand[600]})`,
            boxShadow: `0 10px 26px ${alpha(brand[500], 0.35)}`,
            '&:hover': { background: `linear-gradient(135deg, ${brand[500]}, ${brand[700]})` },
            ...(speaking && { animation: 'listenPulse 1s ease-in-out infinite' }),
            '@keyframes listenPulse': {
              '0%, 100%': { transform: 'scale(1)' },
              '50%': { transform: 'scale(1.06)' },
            },
          }}
        >
          {speaking ? (
            <VolumeUpIcon sx={{ fontSize: { xs: '2.4rem', sm: '3rem' } }} />
          ) : (
            <HeadphonesIcon sx={{ fontSize: { xs: '2.4rem', sm: '3rem' } }} />
          )}
        </IconButton>

        {selected ? (
          <Box>
            <Typography
              sx={{
                fontFamily: (t) => t.fonts.jp,
                fontSize:
                  card.cardType === 'phrase'
                    ? { xs: '2.2rem', sm: '3rem' }
                    : {
                        xs: titleFontSize(card.word, 2.2, 1.1),
                        sm: titleFontSize(card.word, 3.2, 1.4),
                      },
                fontWeight: 700,
                color: 'text.primary',
                whiteSpace: card.cardType === 'phrase' ? undefined : 'nowrap',
              }}
            >
              {card.word}
            </Typography>
            {card.reading && (
              <Typography variant="body1" color="text.secondary">
                {card.reading}
              </Typography>
            )}
            <Typography variant="body1" sx={{ fontWeight: 600, mt: 0.5 }}>
              {card.meaning}
            </Typography>
          </Box>
        ) : (
          <Typography
            variant="caption"
            sx={{ color: 'text.secondary', letterSpacing: '0.12em', display: 'block' }}
          >
            {unlocked ? t('whatDidYouHear') : t('tapToHear')}
          </Typography>
        )}

        <Box sx={{ mt: 1 }}>
          <Button
            size="small"
            startIcon={<ReplayIcon />}
            onClick={onPlay}
            sx={{ color: 'text.secondary' }}
          >
            {t('playAgain')}
          </Button>
        </Box>
      </Box>

      <Box sx={{ flexShrink: 0 }}>
        <ChoiceGrid
          choices={choices}
          correct={card.meaning}
          selected={selected}
          onSelect={onSelect}
        />
      </Box>

      {answeredCorrectly && (
        <Box sx={{ textAlign: 'center', mb: 1, flexShrink: 0 }}>
          <Typography variant="body2" color="success.main" sx={{ fontStyle: 'italic' }}>
            {tCommon('correctMovingOn')}
          </Typography>
        </Box>
      )}
    </>
  );
}
