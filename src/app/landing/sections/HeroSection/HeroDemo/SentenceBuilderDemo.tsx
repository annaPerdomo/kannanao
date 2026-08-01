'use client';

import Box from '@mui/material/Box';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import FuriganaText from '@/components/FuriganaText';
import { emerald, pink, purple, sky } from '@/theme';

import { DEMO_SENTENCE, PHONE_BODY_H } from './constants';

const BUBBLE_COLORS = [sky[400], pink[400], purple[400]];

interface SentenceBuilderDemoProps {
  answered: boolean;
}

/**
 * A Sentence Builder round frozen mid-play. A still of the mode rather than the
 * mode itself — the live one owns XP writes and its own card queue.
 */
export function SentenceBuilderDemo({ answered }: SentenceBuilderDemoProps) {
  const t = useTranslations('Landing.hero');

  return (
    <Box
      sx={{
        height: PHONE_BODY_H,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-evenly',
        px: 1,
        py: 1.25,
        borderRadius: '14px',
        background: `linear-gradient(170deg, ${alpha(sky[100], 0.5)} 0%, ${alpha(pink[50], 0.9)} 100%)`,
        border: `1px solid ${alpha(purple[200], 0.6)}`,
      }}
    >
      <Box sx={{ textAlign: 'center' }}>
        <Typography
          sx={{
            fontSize: '0.86rem',
            fontWeight: 700,
            color: purple[900],
            lineHeight: 2,
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          <FuriganaText text={DEMO_SENTENCE.before} showFurigana />
          <Box
            component="span"
            sx={{
              display: 'inline-block',
              minWidth: 26,
              mx: 0.4,
              px: 0.5,
              borderRadius: '6px',
              textAlign: 'center',
              color: answered ? emerald[700] : 'transparent',
              bgcolor: alpha(answered ? emerald[100] : purple[100], 0.9),
              border: `1.5px ${answered ? 'solid' : 'dashed'} ${answered ? emerald[400] : purple[300]}`,
              transition: 'color 0.3s ease, background-color 0.3s ease, border-color 0.3s ease',
            }}
          >
            {DEMO_SENTENCE.particle}
          </Box>
          <FuriganaText text={DEMO_SENTENCE.after} showFurigana />
        </Typography>
        <Typography sx={{ fontSize: '0.6rem', color: alpha(purple[900], 0.62), lineHeight: 1.4 }}>
          {t('demoPracticeTranslation')}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', gap: 0.9, justifyContent: 'center' }}>
        {DEMO_SENTENCE.options.map((option, i) => {
          const correct = option === DEMO_SENTENCE.particle;
          const picked = answered && correct;
          const color = BUBBLE_COLORS[i % BUBBLE_COLORS.length];
          return (
            <Box
              key={option}
              sx={{
                width: 42,
                height: 42,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.9rem',
                fontWeight: 800,
                color: '#fff',
                textShadow: `0 1px 2px ${alpha('#000', 0.25)}`,
                background: picked
                  ? `radial-gradient(circle at 35% 35%, ${emerald[300]}, ${emerald[500]} 70%)`
                  : `radial-gradient(circle at 35% 35%, ${alpha(color, 0.35)}, ${color} 70%)`,
                boxShadow: picked
                  ? `0 0 18px ${alpha(emerald[500], 0.55)}`
                  : `0 5px 14px ${alpha(color, 0.35)}`,
                opacity: answered && !correct ? 0.35 : 1,
                transform: picked ? 'scale(1.12)' : 'scale(1)',
                transition: 'all 0.35s cubic-bezier(0.34,1.56,0.64,1)',
              }}
            >
              {option}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
