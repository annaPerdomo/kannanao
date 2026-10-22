'use client';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import { ComboChip } from '@/components/ComboChip';
import { stripFurigana } from '@/components/FuriganaText';
import { SpeakButton } from '@/components/SpeakButton';

import { XpEarnedPop } from '../XpEarnedPop';
import { BubbleButton } from './BubbleButton';
import { PARTICLE_HINTS } from './constants';
import { SentenceDisplay } from './SentenceDisplay';
import type { KotobaGame } from './useKotobaGame';

interface GameBoardProps {
  game: KotobaGame;
}

export function GameBoard({ game }: GameBoardProps) {
  const t = useTranslations('Practice.kotobaBubble');
  const tCommon = useTranslations('Practice.common');
  const theme = useTheme();
  const { brand, accent } = theme.palette;

  const { currentSentence, gameSentences, index, options, selected, isCorrect, combo, xpPop } =
    game;

  if (!currentSentence) return null;

  const progress = (index / gameSentences.length) * 100;
  const plainText = stripFurigana(currentSentence.sentenceJp);
  const hintText = PARTICLE_HINTS[currentSentence.targetParticle] ?? t('defaultParticleHint');
  const praise = t.raw('praise') as string[];
  const praiseWord = praise[index % praise.length];

  return (
    <Box sx={{ position: 'relative', display: 'flex', flexDirection: 'column', flex: 1 }}>
      <XpEarnedPop
        amount={xpPop?.amount ?? 0}
        correct={xpPop?.correct ?? true}
        show={!!xpPop}
        key={xpPop?.key}
      />

      <Stack direction="row" alignItems="center" justifyContent="flex-end" sx={{ mb: 1.5, gap: 1 }}>
        <ComboChip count={combo.count} />
        <Typography sx={{ fontSize: '0.95rem', fontWeight: 700, color: 'text.secondary' }}>
          {index + 1} / {gameSentences.length}
        </Typography>
      </Stack>

      <LinearProgress
        variant="determinate"
        value={progress}
        aria-label={t('progressAria', { current: index + 1, total: gameSentences.length })}
        sx={{
          mb: { xs: 1.5, sm: 2 },
          flexShrink: 0,
          height: 8,
          borderRadius: 4,
          bgcolor: alpha(brand[100], 0.5),
          '& .MuiLinearProgress-bar': {
            borderRadius: 4,
            background: `linear-gradient(90deg, ${brand[400]}, ${accent[400]})`,
          },
        }}
      />

      <Paper
        elevation={0}
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          borderRadius: 4,
          border: `1px solid ${alpha(brand[200], 0.5)}`,
          bgcolor: alpha('#fff', 0.5),
          px: { xs: 2, sm: 4 },
          py: { xs: 2, sm: 3 },
          mb: 2,
        }}
      >
        {currentSentence.sentenceType !== 'statement' && (
          <Typography
            sx={{
              fontSize: '0.8rem',
              fontWeight: 700,
              color: 'text.disabled',
              mb: 1.5,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            {currentSentence.sentenceType === 'question' ? t('question') : t('response')}
          </Typography>
        )}

        <SentenceDisplay
          sentence={currentSentence}
          revealed={isCorrect !== null}
          showFurigana={game.showFurigana}
          deckWords={game.deckWords}
        />

        {isCorrect !== null && (
          <Box sx={{ mt: 1.5 }}>
            <SpeakButton text={plainText} iconSize="1.4rem" />
          </Box>
        )}

        {isCorrect === true && (
          <Box
            sx={{
              mt: 2,
              animation: 'fadeIn 0.3s ease',
              '@keyframes fadeIn': { from: { opacity: 0 }, to: { opacity: 1 } },
            }}
          >
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1,
                maxWidth: 400,
                bgcolor: alpha(theme.palette.success.main, 0.1),
                border: `1.5px solid ${alpha(theme.palette.success.main, 0.3)}`,
                borderRadius: 2.5,
                px: 2.5,
                py: 1.2,
              }}
            >
              <Typography sx={{ fontSize: '0.9rem', color: 'success.main', fontWeight: 700 }}>
                {praiseWord}
              </Typography>
            </Box>
          </Box>
        )}

        {isCorrect === false && (
          <Box
            sx={{
              mt: 2,
              animation: 'wrongShake 0.4s ease-out, fadeIn 0.3s ease',
              '@keyframes wrongShake': {
                '0%': { transform: 'translateX(0)' },
                '20%': { transform: 'translateX(-6px)' },
                '40%': { transform: 'translateX(6px)' },
                '60%': { transform: 'translateX(-3px)' },
                '80%': { transform: 'translateX(3px)' },
                '100%': { transform: 'translateX(0)' },
              },
              '@keyframes fadeIn': {
                from: { opacity: 0 },
                to: { opacity: 1 },
              },
            }}
          >
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1,
                maxWidth: 400,
                bgcolor: alpha('#EF4444', 0.1),
                border: `1.5px solid ${alpha('#EF4444', 0.3)}`,
                borderRadius: 2.5,
                px: 2.5,
                py: 1.2,
              }}
            >
              <Typography sx={{ fontSize: '1.1rem' }}>✕</Typography>
              <Typography sx={{ fontSize: '0.9rem', color: 'text.primary' }}>
                {t.rich('wrongAnswer', {
                  particle: currentSentence.targetParticle,
                  hint: hintText,
                  b: (chunks) => <strong>{chunks}</strong>,
                })}
              </Typography>
            </Box>
          </Box>
        )}
      </Paper>

      <Stack
        direction="row"
        spacing={{ xs: 2, sm: 3 }}
        justifyContent="center"
        sx={{ mb: 2, flexShrink: 0, flexWrap: 'wrap', gap: { xs: 2, sm: 3 } }}
      >
        {options.map((particle, i) => {
          let state: 'idle' | 'correct' | 'wrong' = 'idle';
          if (selected) {
            if (particle === currentSentence.targetParticle) state = 'correct';
            else if (particle === selected) state = 'wrong';
          }
          return (
            <BubbleButton
              key={`${particle}-${i}`}
              particle={particle}
              index={i}
              disabled={selected !== null}
              state={state}
              onClick={() => game.handleSelect(particle)}
            />
          );
        })}
      </Stack>

      {isCorrect !== null && (
        <Box sx={{ textAlign: 'center', mb: 1, flexShrink: 0 }}>
          <Button
            variant="contained"
            onClick={game.handleNext}
            sx={{
              borderRadius: 3,
              textTransform: 'none',
              fontWeight: 700,
              px: 5,
              py: 1.2,
              fontSize: '1rem',
            }}
          >
            {tCommon('next')}
          </Button>
        </Box>
      )}
    </Box>
  );
}
