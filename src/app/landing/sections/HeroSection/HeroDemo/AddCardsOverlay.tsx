'use client';

import AutoAwesomeIcon from '@mui/icons-material/AutoAwesomeRounded';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import { Loading } from '@/components/Loading';
import { pink, purple } from '@/theme';

import { type DemoStage, HERO_WORDS, TYPING_FRAMES } from './constants';

/** Fits the 232×250 Tango stage plus its status line inside the dialog. */
const LOADER_SCALE = 0.62;
const LOADER_H = 214;

interface AddCardsOverlayProps {
  stage: DemoStage;
  frame: number;
}

/**
 * The educator's Add Cards dialog, mid-flow. A still of the real panel rather
 * than the component itself — the live dialog owns network calls and deck state.
 */
export function AddCardsOverlay({ stage, frame }: AddCardsOverlayProps) {
  const t = useTranslations('Landing.aiDemo');
  const open = stage === 'typing' || stage === 'generating';
  const { committed, typing } = TYPING_FRAMES[Math.min(frame, TYPING_FRAMES.length - 1)];
  const ready = committed >= HERO_WORDS.length;

  return (
    <Box
      aria-hidden
      sx={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
        zIndex: 2,
        pointerEvents: 'none',
        bgcolor: alpha(purple[900], open ? 0.16 : 0),
        opacity: open ? 1 : 0,
        transition: 'opacity 0.45s ease, background-color 0.45s ease',
      }}
    >
      <Box
        sx={{
          width: '58%',
          maxWidth: 380,
          borderRadius: '16px',
          overflow: 'hidden',
          bgcolor: '#fff',
          border: `1px solid ${alpha(pink[200], 0.8)}`,
          boxShadow: `0 24px 60px ${alpha(purple[700], 0.28)}`,
          transform: open ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.96)',
          transition: 'transform 0.45s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        <Box
          sx={{
            px: 1.75,
            py: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            background: `linear-gradient(135deg, ${pink[500]} 0%, ${purple[600]} 100%)`,
          }}
        >
          <AutoAwesomeIcon sx={{ fontSize: '0.9rem', color: '#fff' }} />
          <Typography sx={{ fontSize: '0.78rem', fontWeight: 800, color: '#fff' }}>
            {t('addCardsPanelTitle')}
          </Typography>
        </Box>

        <Box sx={{ p: 1.75 }}>
          <Typography
            sx={{
              fontSize: '0.56rem',
              fontWeight: 800,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: pink[500],
              mb: 1,
            }}
          >
            {t('generateWithAiLabel')}
          </Typography>

          {stage === 'generating' ? (
            // The app's own Tango loader is built at a fixed 232×250 stage, so
            // it is scaled as a unit to fit the dialog rather than restyled.
            <Box
              sx={{
                height: LOADER_H,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              <Box sx={{ transform: `scale(${LOADER_SCALE})`, transformOrigin: 'center' }}>
                <Loading message={t('generatingCardsMessage')} />
              </Box>
            </Box>
          ) : (
            <>
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: 0.5,
                  px: 1.25,
                  py: 1,
                  mb: 1.25,
                  minHeight: 58,
                  borderRadius: '10px',
                  bgcolor: '#fff',
                  border: `1.5px solid ${alpha(pink[400], 0.55)}`,
                }}
              >
                {HERO_WORDS.slice(0, committed).map((w) => (
                  <Chip
                    key={w}
                    label={w}
                    size="small"
                    sx={{
                      height: 21,
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      bgcolor: alpha(pink[100], 0.6),
                      color: pink[700],
                      border: `1px solid ${alpha(pink[400], 0.4)}`,
                    }}
                  />
                ))}
                <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 40 }}>
                  <Typography sx={{ fontSize: '0.74rem', fontWeight: 600, color: purple[700] }}>
                    {typing}
                  </Typography>
                  <Box
                    component="span"
                    sx={{
                      display: 'inline-block',
                      width: '2px',
                      height: '0.95em',
                      ml: '2px',
                      bgcolor: purple[400],
                      animation: 'cursorBlink 0.75s steps(1) infinite',
                    }}
                  />
                </Box>
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 0.75,
                  py: '9px',
                  borderRadius: '10px',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  color: ready ? '#fff' : alpha(purple[700], 0.4),
                  background: ready
                    ? `linear-gradient(135deg, ${pink[400]} 0%, ${pink[500]} 50%, ${purple[500]} 100%)`
                    : alpha(purple[100], 0.8),
                  boxShadow: ready ? `0 4px 14px ${alpha(pink[500], 0.35)}` : 'none',
                  transition: 'background 0.3s ease, color 0.3s ease',
                }}
              >
                <AutoAwesomeIcon sx={{ fontSize: 14 }} />
                {t('generateButton')}
              </Box>
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
}
