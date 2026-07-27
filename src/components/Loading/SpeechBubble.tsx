'use client';
import { alpha, Box, Typography, useTheme } from '@mui/material';

import FuriganaText from '@/components/FuriganaText';

import { PHRASE_CYCLE_SECONDS, phraseCycle, PHRASES, shimmer } from './constants';

interface SpeechBubbleProps {
  reducedMotion: boolean;
}

/**
 * The bubble above Tango's head, cycling through encouragement in Japanese +
 * English. Cycles in the fixed PHRASES order rather than a per-mount
 * shuffle — this renders server-side, and shuffling with Math.random() would
 * make the server and client pick different starting phrases and trigger a
 * hydration mismatch.
 */
export function SpeechBubble({ reducedMotion }: SpeechBubbleProps) {
  const theme = useTheme();
  const { brand } = theme.palette;

  return (
    <Box
      sx={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', zIndex: 4 }}
    >
      <Box
        sx={{
          position: 'relative',
          minWidth: 118,
          maxWidth: 210,
          minHeight: 62,
          px: 2,
          py: 1.25,
          bgcolor: 'background.paper',
          border: '2.5px solid',
          borderColor: alpha(brand[300], 0.7),
          borderRadius: '20px',
          boxShadow: `0 6px 18px ${alpha(brand[400], 0.22)}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            bottom: -9,
            left: '50%',
            ml: '-8px',
            width: 16,
            height: 16,
            bgcolor: 'background.paper',
            borderRight: '2.5px solid',
            borderBottom: '2.5px solid',
            borderColor: alpha(brand[300], 0.7),
            borderRadius: '0 0 5px 0',
            transform: 'rotate(45deg)',
          }}
        />
        <Box sx={{ position: 'relative', width: '100%' }}>
          {reducedMotion ? (
            <PhraseContent phrase={PHRASES[0]} />
          ) : (
            PHRASES.map((phrase, slot) => (
              <Box
                key={phrase.jp}
                sx={{
                  position: slot === 0 ? 'relative' : 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 0.5,
                  opacity: 0,
                  animation: `${phraseCycle} ${PHRASES.length * PHRASE_CYCLE_SECONDS}s ease-in-out infinite`,
                  animationDelay: `${slot * PHRASE_CYCLE_SECONDS}s`,
                }}
              >
                <PhraseContent phrase={phrase} />
              </Box>
            ))
          )}
        </Box>
      </Box>
    </Box>
  );
}

function PhraseContent({ phrase }: { phrase: { jp: string; en: string } }) {
  const theme = useTheme();
  const { brand } = theme.palette;
  return (
    <>
      <FuriganaText
        text={phrase.jp}
        showFurigana
        sx={{
          fontFamily: theme.fonts.jp,
          fontWeight: 700,
          fontSize: '0.95rem',
          lineHeight: 1.3,
          textAlign: 'center',
          whiteSpace: 'nowrap',
          background: `linear-gradient(135deg, ${brand[400]} 0%, ${brand[700]} 38%, ${brand[400]} 62%, ${brand[300]} 100%)`,
          backgroundSize: '300% auto',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          animation: `${shimmer} 4s linear infinite`,
          '& rt': { WebkitTextFillColor: alpha(brand[700], 0.75), color: alpha(brand[700], 0.75) },
        }}
      />
      <Typography
        sx={{
          fontSize: '0.62rem',
          fontWeight: 700,
          letterSpacing: '0.05em',
          color: alpha(brand[700], 0.55),
          textAlign: 'center',
          whiteSpace: 'nowrap',
        }}
      >
        {phrase.en}
      </Typography>
    </>
  );
}
